
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

import { apiCoachChat } from "../../lib/api";
import { getOtherCoachThreadContext, saveCoachThread } from "../../lib/coachThreads";
import ClassroomCameraCard from "./ClassroomCameraCard";

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];
const CATEGORY_OPTIONS = ["Shot Miss", "Control", "Tilt", "Strategy"];
const SHOT_OPTIONS = ["Left Ramp", "Right Ramp", "Orbit", "Trap", "Skill Shot"];
const SEVERITY_OPTIONS = ["Low", "Medium", "High"];
const QUICK_REPLIES = [
  "What should I focus on this ball?",
  "What pattern are you seeing?",
  "Give me one calmer adjustment.",
  "What is the safest next plan?",
];
const SESSION_RESET_VERSION = "v5";
const INITIAL_EVENTS = [
  {
    id: 1,
    game: 1,
    ball: null,
    category: "Control",
    shot: "Orbit",
    severity: "Medium",
    notes: "Late right-orbit catch.",
  },
];

function formatElapsed(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getInitialMessages() {
  return [];
}

export default function LiveSessionScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameResultsRef = useRef(null);
  const chatThreadRef = useRef(null);
  const nextMessageIdRef = useRef(2);

  const gameName = searchParams.get("gameName") ?? "Unknown Game";
  const location = searchParams.get("location") ?? "Location not set";
  const playType = searchParams.get("playType") ?? "Solo";
  const storageKey = `flipperiq-live-session-v3:${gameName}|${location}|${playType}`;
  const coachThreadKey = `now-playing:${gameName}|${location}|${playType}`;

  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionState, setSessionState] = useState("Ready");
  const [currentGame, setCurrentGame] = useState(1);
  const [ballCount, setBallCount] = useState(3);
  const [currentBall, setCurrentBall] = useState(1);
  const [ballAdvanced, setBallAdvanced] = useState(false);
  const [gameResults, setGameResults] = useState([]);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [shot, setShot] = useState(SHOT_OPTIONS[0]);
  const [severity, setSeverity] = useState(SEVERITY_OPTIONS[1]);
  const [notes, setNotes] = useState("");
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachDraft, setCoachDraft] = useState("");
  const [coachMessages, setCoachMessages] = useState(() => getInitialMessages());
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const resetMarkerKey = "flipperiq-live-session-reset-version";
    if (window.sessionStorage.getItem(resetMarkerKey) !== SESSION_RESET_VERSION) {
      Object.keys(window.sessionStorage).forEach((key) => {
        if (key.startsWith("flipperiq-live-session:") || key.startsWith("flipperiq-live-session-v2:") || key.startsWith("flipperiq-live-session-v3:")) {
          window.sessionStorage.removeItem(key);
        }
      });
      window.sessionStorage.setItem(resetMarkerKey, SESSION_RESET_VERSION);
    }

    setLocationEnabled(window.localStorage.getItem("flipperiq-location-enabled") === "true");

    const savedSession = window.sessionStorage.getItem(storageKey);
    if (!savedSession) {
      setCoachMessages(getInitialMessages());
      setIsSessionRestored(true);
      return;
    }

    try {
      const parsed = JSON.parse(savedSession);
      setElapsedSeconds(parsed.elapsedSeconds ?? 0);
      setSessionState(parsed.sessionState ?? "Ready");
      setCurrentGame(parsed.currentGame ?? 1);
      setBallCount(parsed.ballCount ?? 3);
      setCurrentBall(parsed.currentBall ?? 1);
      setBallAdvanced(parsed.ballAdvanced ?? false);
      setGameResults(Array.isArray(parsed.gameResults) ? parsed.gameResults : []);
      setCategory(parsed.category ?? CATEGORY_OPTIONS[0]);
      setShot(parsed.shot ?? SHOT_OPTIONS[0]);
      setSeverity(parsed.severity ?? SEVERITY_OPTIONS[1]);
      setNotes(parsed.notes ?? "");
      setEvents(Array.isArray(parsed.events) && parsed.events.length ? parsed.events : INITIAL_EVENTS);
      setIsCoachOpen(parsed.isCoachOpen ?? false);
      setCoachDraft(parsed.coachDraft ?? "");
      setCoachMessages(Array.isArray(parsed.coachMessages) ? parsed.coachMessages : getInitialMessages());
    } catch {
      window.sessionStorage.removeItem(storageKey);
      setCoachMessages(getInitialMessages());
    }

    setIsSessionRestored(true);
  }, [gameName, storageKey]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (isCoachOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isCoachOpen]);

  useEffect(() => {
    if (!isSessionRestored) {
      return;
    }

    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        elapsedSeconds,
        sessionState,
        currentGame,
        ballCount,
        currentBall,
        ballAdvanced,
        gameResults,
        category,
        shot,
        severity,
        notes,
        events,
        isCoachOpen,
        coachDraft,
        coachMessages,
      })
    );

    saveCoachThread(coachThreadKey, {
      roomLabel: `Now Playing: ${gameName}`,
      messages: coachMessages,
      draft: coachDraft,
    });
  }, [ballAdvanced, ballCount, category, coachDraft, coachMessages, coachThreadKey, currentBall, currentGame, elapsedSeconds, events, gameName, gameResults, isCoachOpen, isSessionRestored, notes, sessionState, severity, shot, storageKey]);

  useEffect(() => {
    if (sessionState !== "Active") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [sessionState]);

  useEffect(() => {
    if (gameResultsRef.current) {
      gameResultsRef.current.scrollTo({ left: gameResultsRef.current.scrollWidth, behavior: "smooth" });
    }
  }, [gameResults]);

  useEffect(() => {
    if (!isCoachOpen || !chatThreadRef.current) {
      return;
    }

    const thread = chatThreadRef.current;
    const frameId = window.requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [coachMessages, isCoachOpen]);

  const recentEvents = [...events].reverse();
  const canPauseOrEnd = sessionState === "Active" || sessionState === "Paused";

  function handleBack() {
    navigateBackWithinApp(router, "/prepare-session");
  }

  function handleAddEvent() {
    const trimmedNotes = notes.trim();
    setEvents((current) => [
      ...current,
      {
        id: Date.now(),
        game: currentGame,
        ball: ballAdvanced ? currentBall : null,
        category,
        shot,
        severity,
        notes: trimmedNotes || "No extra note.",
      },
    ]);
    setNotes("");
  }

  function handlePauseResume() {
    if (canPauseOrEnd) {
      setSessionState((current) => (current === "Paused" ? "Active" : "Paused"));
    }
  }

  function handleOpenScoreModal() {
    if (canPauseOrEnd) {
      setScoreInput("");
      setShowScoreModal(true);
    }
  }

  function handleFinalizeGameScore() {
    const parsedScore = Number(scoreInput.replace(/,/g, "").trim());
    if (!Number.isFinite(parsedScore) || parsedScore < 0) {
      return;
    }

    setGameResults((current) => [...current, { game: currentGame, score: parsedScore }]);
    setElapsedSeconds(0);
    setSessionState("Reviewing");
    setCurrentBall(1);
    setBallAdvanced(false);
    setShowScoreModal(false);
    setScoreInput("");
  }

  function handleStartNextGame() {
    setCurrentGame((current) => (sessionState === "Reviewing" ? current + 1 : current));
    setCurrentBall(1);
    setBallAdvanced(false);
    setElapsedSeconds(0);
    setSessionState("Active");
  }

  function handleAdvanceBall() {
    if (sessionState === "Reviewing") {
      return;
    }

    setCurrentBall((current) => {
      if (current < ballCount) {
        setBallAdvanced(true);
        return current + 1;
      }
      return current;
    });
  }

  async function sendCoachMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = {
      id: `m${nextMessageIdRef.current++}`,
      sender: "You",
      text: trimmed,
      time: "Just now",
    };
    const nextMessages = [...coachMessages, userMessage];
    setCoachMessages(nextMessages);
    setCoachDraft("");
    setChatError("");
    setIsSending(true);

    try {
      const eventSummary = recentEvents.slice(0, 5).map((event) => ({
        game: event.game,
        ball: event.ball,
        category: event.category,
        shot: event.shot,
        severity: event.severity,
        notes: event.notes,
      }));
      const otherThreadContext = getOtherCoachThreadContext(coachThreadKey);
      const response = await apiCoachChat({
        persona: "PinCoach",
        message: `We are in Now Playing. Game: ${gameName}. Location: ${location}. Play type: ${playType}. Session state: ${sessionState}. Current game: ${currentGame}. Current ball: ${currentBall}. User asks: ${trimmed}${otherThreadContext ? `

Other room coach context:
${otherThreadContext}` : ""}`,
        machine_name: gameName !== "Unknown Game" ? gameName : null,
        include_location: locationEnabled,
        metadata: {
          room: "Now Playing",
          play_type: playType,
          session_state: sessionState,
          current_game: currentGame,
          current_ball: currentBall,
          recent_events: eventSummary,
        },
        recent_messages: nextMessages.slice(-6).map((entry) => ({ speaker: entry.sender, text: entry.text })),
      });

      setCoachMessages((current) => [
        ...current,
        {
          id: `m${nextMessageIdRef.current++}`,
          sender: response.persona || "PinCoach",
          text: response.reply,
          time: "Just now",
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Coach reply failed.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="screen">
      <div className="phoneShell">
        <header className="topBar">
          <button type="button" className="navArrow" aria-label="Back" onClick={handleBack}>
            &#8249;
          </button>
          <h1>Now Playing</h1>
          <div className="topStatusSpacer" />
        </header>

        {!isCoachOpen ? (
          <div className="floatingCoachLayer">
            <button type="button" className="floatingCoachButton" aria-label="Open PinCoach chat" onClick={() => setIsCoachOpen(true)}>
              <div className="floatingCoachAvatar">
                <Image src="/tilt-lab/flipcoach-avatar.png" alt="PinCoach avatar" fill sizes="58px" style={{ objectFit: "contain", objectPosition: "center" }} />
              </div>
            </button>
          </div>
        ) : null}

        <main className="content">
          <section className="heroCard">
            <div className="heroArt">
              <Image src="/tilt-lab/flipcoach-hero.png" alt="PinCoach" fill sizes="120px" style={{ objectFit: "contain", objectPosition: "left top" }} />
            </div>
            <div className="heroContent">
              <div className="heroTitle">PinCoach</div>
              <div className="heroSubtitle">Live Session Coach</div>
              <div className="heroMessage">Log mistakes while you play and ask for one quick adjustment at a time. This chat thread stays inside Now Playing and does not show up in other rooms.</div>
            </div>
            <div className="heroBubble">
              <div className="heroBubbleTitle">{gameName}</div>
              <div className="heroBubbleMeta">{location} | {playType}</div>
              <div className="heroStatsRow">
                <div className="heroStat"><span>Status</span><strong>{sessionState}</strong></div>
                <div className="heroStat"><span>Game</span><strong>{currentGame}</strong></div>
                <div className="heroStat"><span>Ball</span><strong>{currentBall}</strong></div>
              </div>
            </div>
          </section>

          <ClassroomCameraCard storageKey="flipperiq-session-camera-live" title="Now Playing Shot Review" hint="Capture the playfield, then mark flipper contact, path points, red error contacts, and drain spots while the session is live." enableMarkup gameNumber={currentGame} ballNumber={currentBall} maxBallNumber={ballCount} onGameNumberChange={setCurrentGame} onBallNumberChange={setCurrentBall} />

          <section className="sectionCard sessionControlsCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionKicker">Session controls</div>
                <h3>Manage live play</h3>
              </div>
              <div className="sessionTimerBadge">{formatElapsed(elapsedSeconds)}</div>
            </div>
            <div className="controlRow">
              <button type="button" className="controlButton controlButtonPrimary" onClick={canPauseOrEnd ? handlePauseResume : handleStartNextGame}>
                {canPauseOrEnd ? (sessionState === "Paused" ? "Resume" : "Pause") : "Start Game"}
              </button>
              <button type="button" className="controlButton" onClick={handleAdvanceBall} disabled={sessionState === "Reviewing"}>Next Ball</button>
              <button type="button" className="controlButton controlButtonDanger" onClick={handleOpenScoreModal} disabled={!canPauseOrEnd}>End Game</button>
            </div>
            {gameResults.length ? (
              <div className="gameTimesRow" ref={gameResultsRef}>
                {gameResults.map((item) => (
                  <div key={item.game} className="gameTimePill">Game {item.game}: {item.score.toLocaleString()}</div>
                ))}
              </div>
            ) : null}
            <button type="button" className="endSessionButton" onClick={() => { window.sessionStorage.removeItem(storageKey); router.push("/prepare-session"); }}>
              End Session
            </button>
          </section>

          <section className="sectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionKicker">Track issues</div>
                <h3>Log what just happened</h3>
              </div>
            </div>

            <div className="fieldLabel">Category</div>
            <div className="chipRow">
              {CATEGORY_OPTIONS.map((option) => (
                <button key={option} type="button" className={`chipButton ${category === option ? "chipButtonActive" : ""}`} onClick={() => setCategory(option)}>{option}</button>
              ))}
            </div>

            <div className="fieldLabel">Shot / Situation</div>
            <div className="chipRow">
              {SHOT_OPTIONS.map((option) => (
                <button key={option} type="button" className={`chipButton ${shot === option ? "chipButtonActive" : ""}`} onClick={() => setShot(option)}>{option}</button>
              ))}
            </div>

            <div className="fieldLabel">Severity</div>
            <div className="chipRow chipRowCompact">
              {SEVERITY_OPTIONS.map((option) => (
                <button key={option} type="button" className={`chipButton ${severity === option ? "chipButtonActive" : ""}`} onClick={() => setSeverity(option)}>{option}</button>
              ))}
            </div>

            <textarea className="notesInput" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a quick note about the feed, miss, or decision..." />
            <button type="button" className="primaryButton" onClick={handleAddEvent}>Add Error</button>
          </section>

          <section className="sectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionKicker">Recent notes</div>
                <h3>What this room has logged</h3>
              </div>
            </div>
            <div className="eventList">
              {recentEvents.map((event) => (
                <div key={event.id} className="eventCard">
                  <div className="eventTopRow">
                    <div className="eventTitle">Game {event.game}{event.ball ? ` | Ball ${event.ball}` : ""}</div>
                    <div className={`eventSeverity eventSeverity${event.severity}`}>{event.severity}</div>
                  </div>
                  <div className="eventMeta">{event.category} | {event.shot}</div>
                  <div className="eventNotes">{event.notes}</div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <nav className="bottomNav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button key={item.label} type="button" className="navItem" onClick={() => router.push(item.href)}>
              <span className="navIcon" aria-hidden="true">
                {item.label === "Account" && "O"}
                {item.label === "Analytics" && "|"}
                {item.label === "PinMap" && "*"}
                {item.label === "Home" && "#"}
                {item.label === "Classroom" && "="}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {showScoreModal ? (
          <div className="modalScrim">
            <div className="scoreModal">
              <div className="sectionKicker">Game complete</div>
              <h3>Enter score for Game {currentGame}</h3>
              <input type="text" inputMode="numeric" className="scoreInput" value={scoreInput} onChange={(event) => setScoreInput(event.target.value)} placeholder="Enter final score" />
              <div className="scoreModalActions">
                <button type="button" className="modalButton modalButtonGhost" onClick={() => setShowScoreModal(false)}>Cancel</button>
                <button type="button" className="modalButton" onClick={handleFinalizeGameScore}>Save Score</button>
              </div>
            </div>
          </div>
        ) : null}

        {isCoachOpen ? (
          <div className="chatOverlay">
            <div className="chatBackdrop" onClick={() => setIsCoachOpen(false)} />
            <div className="chatPanel">
              <div className="chatHeader">
                <button type="button" className="chatBackButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>&#8249;</button>
                <div className="chatHeaderTitle">PinCoach</div>
                <div className="chatHeaderAvatar">
                  <Image src="/tilt-lab/flipcoach-avatar.png" alt="PinCoach avatar" fill sizes="52px" style={{ objectFit: "contain", objectPosition: "center" }} />
                </div>
              </div>

              <div className="chatCoachRow">
                <div className="chatCoachAvatar">
                  <Image src="/tilt-lab/flipcoach-avatar.png" alt="PinCoach avatar" fill sizes="56px" style={{ objectFit: "contain", objectPosition: "center" }} />
                </div>
                <div className="chatCoachMeta">
                  <div className="chatCoachName">PinCoach</div>
                  <div className="chatCoachRole">Live Session Coach</div>
                </div>
                <button type="button" className="chatCloseButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>×</button>
              </div>

              <div className="chatThread" ref={chatThreadRef}>
                {coachMessages.length ? coachMessages.map((message) => (
                  <div key={message.id} className={`chatMessageWrap ${message.sender === "You" ? "chatMessageWrapUser" : ""}`}>
                    <div className={`chatBubble ${message.sender === "You" ? "chatBubbleUser" : ""}`}>{message.text}</div>
                    <div className="chatTime">{message.time}</div>
                  </div>
                )) : <div className="chatEmpty">Ask what to focus on this ball, what pattern is showing up, or what the safest next plan is.</div>}
              </div>

              <div className="chatReplies">
                {QUICK_REPLIES.map((reply) => (
                  <button key={reply} type="button" className="chatReplyChip" onClick={() => sendCoachMessage(reply)} disabled={isSending}>{reply}</button>
                ))}
              </div>

              <div className="chatComposer">
                <button type="button" className="chatEmojiButton" aria-label="Emoji">?</button>
                <input
                  type="text"
                  value={coachDraft}
                  onChange={(event) => setCoachDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendCoachMessage(coachDraft);
                    }
                  }}
                  placeholder="Ask PinCoach..."
                />
                <button type="button" className="chatSendButton" onClick={() => sendCoachMessage(coachDraft)} disabled={isSending || !coachDraft.trim()}>
                  {isSending ? "..." : "\u27A4"}
                </button>
              </div>
              {chatError ? <div className="chatError">{chatError}</div> : null}
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #f3f5f8; font-family: "Segoe UI", Arial, sans-serif; }
        .phoneShell { position: relative; width: 390px; max-width: 100%; min-height: 844px; display: flex; flex-direction: column; overflow: hidden; border-radius: 34px; border: 8px solid #05070d; background: linear-gradient(180deg, #102649 0%, #08172d 100%); color: #f3f7ff; box-shadow: 0 28px 70px rgba(0, 0, 0, 0.28); }
        .topBar { min-height: 92px; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; gap: 10px; padding: 28px 18px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        h1 { margin: 0; text-align: center; font-size: 19px; font-weight: 700; color: #f7f4e6; }
        .navArrow,.floatingCoachButton,.chatBackButton,.chatCloseButton,.chatReplyChip,.chatEmojiButton,.chatSendButton,.navItem,.controlButton,.chipButton,.primaryButton,.endSessionButton,.modalButton { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .navArrow { width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent; color: #d7e4ff; font-size: 24px; line-height: 1; }
        .topStatusSpacer { width: 40px; }
        .floatingCoachLayer { position: fixed; inset: 0; z-index: 40; pointer-events: none; }
        .floatingCoachButton { position: fixed; top: 72px; right: max(15px, calc((100vw - 390px) / 2 + 15px)); z-index: 41; pointer-events: auto; width: 62px; height: 62px; padding: 0; border: 1px solid rgba(139,196,255,0.55); border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(94,178,255,0.85), rgba(19,54,122,0.98)); box-shadow: 0 0 0 3px rgba(139,196,255,0.18), 0 0 24px rgba(58,146,255,0.32); }
        .floatingCoachAvatar,.chatHeaderAvatar,.chatCoachAvatar { position: relative; overflow: hidden; border-radius: 50%; background: radial-gradient(circle at 50% 35%, rgba(10,19,42,0.9), rgba(4,10,24,0.98)); }
        .floatingCoachAvatar { position: absolute; inset: 5px; }
        .content { flex: 1; overflow-y: auto; padding: 14px; display: grid; gap: 12px; }
        .heroCard,.sectionCard,.eventCard,.scoreModal { border-radius: 18px; border: 1px solid rgba(117,148,211,0.2); background: linear-gradient(180deg, rgba(18,34,69,0.96), rgba(9,18,38,0.98)); box-shadow: 0 10px 24px rgba(0,0,0,0.2); }
        .heroCard,.sectionCard { padding: 14px; }
        .heroCard { display: grid; grid-template-columns: 92px minmax(0,1fr); gap: 10px 12px; align-items: start; overflow: hidden; }
        .heroArt { position: relative; min-height: 116px; }
        .heroContent { min-width: 0; padding-top: 6px; padding-right: 66px; }
        .heroTitle { font-size: 20px; font-weight: 800; color: #f4f7ff; }
        .heroSubtitle,.sectionKicker,.fieldLabel { color: #49aaff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
        .heroMessage { margin-top: 12px; color: #d2dcee; font-size: 13px; line-height: 1.4; }
        .heroBubble { grid-column: 1 / -1; padding: 12px 14px; border-radius: 14px; background: rgba(33,52,95,0.92); }
        .heroBubbleTitle { color: #f7f4e6; font-size: 18px; font-weight: 800; }
        .heroBubbleMeta { margin-top: 6px; color: #d9e7ff; font-size: 13px; line-height: 1.35; }
        .heroStatsRow { margin-top: 12px; display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
        .heroStat { padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(165,190,232,0.16); }
        .heroStat span { display: block; margin-bottom: 6px; color: #9db7dd; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .heroStat strong { color: #f7f4e6; font-size: 14px; }
        .sectionHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        
        .sessionTimerBadge { flex: 0 0 auto; align-self: center; min-width: 64px; padding: 6px 10px; border-radius: 999px; background: rgba(106,169,255,0.14); border: 1px solid rgba(106,169,255,0.3); color: #9dc4ff; font-size: 11px; font-weight: 800; text-align: center; }
        .sectionHeader h3,.scoreModal h3 { margin: 6px 0 0; font-size: 18px; font-weight: 800; color: #f7f4e6; }
        .controlRow,.chipRow,.scoreModalActions { display: flex; flex-wrap: wrap; gap: 8px; }
        .controlRow { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .gameTimesRow { margin-bottom: 12px; }
        .controlButton,.chipButton,.primaryButton,.modalButton,.endSessionButton { border: 0; border-radius: 12px; font-weight: 700; }
        .controlButton { width: 100%; min-height: 44px; padding: 0 12px; background: rgba(255,255,255,0.08); color: #f3f7ff; }
        .controlButtonPrimary,.primaryButton,.modalButton { background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%); color: #fff; }
        .controlButtonDanger { background: linear-gradient(180deg, #f07c6d 0%, #cb5648 100%); }
        .controlButton:disabled,.chatSendButton:disabled { opacity: 0.55; cursor: default; }
        .gameTimesRow { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .gameTimesRow::-webkit-scrollbar,.chatReplies::-webkit-scrollbar { display: none; }
        .gameTimePill,.chipButton { min-height: 38px; padding: 0 12px; background: rgba(255,255,255,0.06); color: #dce7ff; border: 1px solid rgba(165,190,232,0.18); }
        .gameTimePill { flex: 0 0 auto; display: inline-flex; align-items: center; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .chipButtonActive { background: linear-gradient(180deg, #3d88f6 0%, #2a67d8 100%); border-color: rgba(154,195,255,0.5); color: #fff; }
        .fieldLabel { margin: 14px 0 8px; }
        .chipRowCompact { margin-bottom: 12px; }
        .notesInput,.scoreInput { width: 100%; border-radius: 12px; border: 1px solid rgba(138,173,232,0.24); background: rgba(41,72,118,0.42); color: #f3f7ff; font-size: 14px; font-family: inherit; outline: 0; }
        .notesInput { min-height: 78px; margin: 6px 0 12px; padding: 12px; resize: none; }
        .scoreInput { min-height: 46px; margin-top: 14px; padding: 0 12px; }
        .notesInput::placeholder,.scoreInput::placeholder,.chatComposer input::placeholder { color: #9db1d1; }
        .primaryButton,.modalButton,.endSessionButton { min-height: 42px; padding: 0 14px; }
        .endSessionButton { width: 100%; margin-top: 12px; background: rgba(255,255,255,0.08); color: #f3f7ff; }
        .eventList { display: grid; gap: 10px; }
        .eventCard { padding: 12px; background: rgba(255,255,255,0.04); }
        .eventTopRow { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; }
        .eventTitle { color: #f7f4e6; font-size: 14px; font-weight: 800; }
        .eventSeverity { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .eventSeverityLow { background: rgba(66,211,146,0.16); color: #9ef1c6; }
        .eventSeverityMedium { background: rgba(245,165,36,0.18); color: #ffd892; }
        .eventSeverityHigh { background: rgba(240,124,109,0.18); color: #ffc1b8; }
        .eventMeta { margin-top: 6px; color: #9db7dd; font-size: 12px; font-weight: 700; }
        .eventNotes { margin-top: 8px; color: #dce7ff; font-size: 13px; line-height: 1.45; }
        .modalScrim { position: absolute; inset: 0; z-index: 60; }
        .chatOverlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 24px 14px; }
        .modalScrim { display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(3,10,19,0.72); }
        .scoreModal { width: 100%; max-width: 320px; padding: 18px; }
        .scoreModalActions { margin-top: 14px; justify-content: flex-end; }
        .modalButtonGhost { background: rgba(255,255,255,0.08); color: #f3f7ff; }
        .chatBackdrop { position: absolute; inset: 0; background: rgba(3,8,17,0.58); backdrop-filter: blur(4px); }
        .chatPanel { position: relative; z-index: 1; width: 100%; max-width: 358px; height: min(775px, calc(100vh - 90px)); min-height: 775px; max-height: calc(100vh - 90px); display: flex; flex-direction: column; border-radius: 22px; background: linear-gradient(180deg, rgba(11,21,43,0.98), rgba(6,13,27,0.99)); border-top: 1px solid rgba(101,128,183,0.32); box-shadow: 0 -22px 44px rgba(0,0,0,0.34); min-width: 0; overflow: hidden; }
        .chatHeader { display: grid; grid-template-columns: 40px minmax(0,1fr) 52px; align-items: center; gap: 10px; padding: 12px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .chatBackButton,.chatCloseButton,.chatEmojiButton,.chatSendButton { border: 0; border-radius: 999px; background: rgba(255,255,255,0.08); color: #e6efff; }
        .chatBackButton { width: 40px; height: 40px; font-size: 26px; line-height: 1; }
        .chatHeaderTitle { text-align: center; font-size: 16px; font-weight: 800; color: #f1f6ff; }
        .chatHeaderAvatar { width: 52px; height: 52px; justify-self: end; }
        .chatCoachRow { display: grid; grid-template-columns: 56px minmax(0,1fr) 34px; align-items: center; gap: 10px; padding: 12px 16px 8px; }
        .chatCoachAvatar { width: 56px; height: 56px; }
        .chatCoachName { color: #f4f7ff; font-size: 16px; font-weight: 800; }
        .chatCoachRole { margin-top: 3px; color: #9fb6dd; font-size: 12px; font-weight: 700; }
        .chatCloseButton { width: 34px; height: 34px; font-size: 24px; line-height: 1; }
        .chatThread { flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; padding: 4px 16px 12px; display: grid; gap: 12px; }
        .chatEmpty { padding: 10px 12px; border-radius: 16px; background: rgba(24,44,80,0.82); color: #8fb7ff; font-size: 12px; font-weight: 700; line-height: 1.45; }
        .chatMessageWrap { display: grid; justify-items: start; gap: 4px; min-width: 0; }
        .chatMessageWrapUser { justify-items: end; }
        .chatBubble { min-width: 0; max-width: 88%; padding: 10px 12px; border-radius: 16px 16px 16px 6px; background: rgba(24,44,80,0.95); color: #dce7ff; font-size: 14px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
        .chatBubbleUser { border-radius: 16px 16px 6px 16px; background: linear-gradient(180deg, rgba(65,140,255,0.95), rgba(46,103,214,0.95)); color: #fff; }
        .chatTime { color: #8ca4ca; font-size: 11px; font-weight: 700; }
        .chatReplies { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px 10px; scrollbar-width: none; }
        .chatReplyChip { flex: 0 0 auto; min-height: 34px; padding: 0 12px; border: 1px solid rgba(123,153,211,0.16); border-radius: 999px; background: rgba(18,33,64,0.92); color: #d6e4ff; font-size: 12px; font-weight: 700; }
        .chatComposer { display: grid; grid-template-columns: 38px minmax(0,1fr) 48px; gap: 8px; align-items: center; padding: 0 16px 16px; }
        .chatEmojiButton { width: 38px; height: 38px; font-size: 16px; }
        .chatComposer input { height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(123,153,211,0.16); background: rgba(18,33,64,0.92); color: #eff5ff; font-size: 14px; }
        .chatSendButton { height: 40px; font-size: 18px; font-weight: 800; }
        .chatError { padding: 0 16px 16px; color: #ffb6b6; font-size: 12px; font-weight: 700; }
        .bottomNav { height: 74px; display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; padding: 6px 6px 10px; background: #f6f4ef; border-top: 1px solid rgba(8,23,45,0.12); }
        .navItem { width: 100%; min-height: 100%; padding: 0; border: 0; background: transparent; color: #7f8694; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 600; }
        .navIcon { font-size: 18px; line-height: 1; }
        @media (max-width: 520px) {
          .screen { padding: 0; background: #08172d; }
          .phoneShell { width: 100%; min-height: 100vh; border: 0; border-radius: 0; }
          .floatingCoachButton { top: 15px; right: 18px; }
          .chatPanel { min-height: 72%; }
        }
      `}</style>
    </div>
  );
}















