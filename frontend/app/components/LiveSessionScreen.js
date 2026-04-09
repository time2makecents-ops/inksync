
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

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

export default function LiveSessionScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameResultsRef = useRef(null);

  const gameName = searchParams.get("gameName") ?? "Unknown Game";
  const location = searchParams.get("location") ?? "Location not set";
  const playType = searchParams.get("playType") ?? "Solo";
  const storageKey = `flipperiq-live-session-v3:${gameName}|${location}|${playType}`;

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

    const savedSession = window.sessionStorage.getItem(storageKey);
    if (!savedSession) {
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
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }

    setIsSessionRestored(true);
  }, [gameName, storageKey]);

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
      })
    );
  }, [ballAdvanced, ballCount, category, currentBall, currentGame, elapsedSeconds, events, gameResults, isSessionRestored, notes, sessionState, severity, shot, storageKey]);

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

        <main className="content">
          <section className="heroCard">
            <div className="heroArt">
              <Image src="/classroom/video-room.png" alt="Now Playing" fill sizes="120px" style={{ objectFit: "contain", objectPosition: "left top" }} />
            </div>
            <div className="heroContent">
              <div className="heroTitle">Now Playing</div>
              <div className="heroSubtitle">Live Session Tracking</div>
              <div className="heroMessage">Log mistakes while you play, capture reference shots, and keep the current game organized one ball at a time.</div>
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
      </div>

      <style jsx>{`
        .screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #f3f5f8; font-family: "Segoe UI", Arial, sans-serif; }
        .phoneShell { position: relative; width: 390px; max-width: 100%; min-height: 844px; display: flex; flex-direction: column; overflow: hidden; border-radius: 34px; border: 8px solid #05070d; background: linear-gradient(180deg, #102649 0%, #08172d 100%); color: #f3f7ff; box-shadow: 0 28px 70px rgba(0, 0, 0, 0.28); }
        .topBar { min-height: 92px; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; gap: 10px; padding: 28px 18px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        h1 { margin: 0; text-align: center; font-size: 19px; font-weight: 700; color: #f7f4e6; }
        .navArrow,.navItem,.controlButton,.chipButton,.primaryButton,.endSessionButton,.modalButton { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .navArrow { width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent; color: #d7e4ff; font-size: 24px; line-height: 1; }
        .topStatusSpacer { width: 40px; }
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
        .controlButton:disabled { opacity: 0.55; cursor: default; }
        .gameTimesRow { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .gameTimesRow::-webkit-scrollbar { display: none; }
        .gameTimePill,.chipButton { min-height: 38px; padding: 0 12px; background: rgba(255,255,255,0.06); color: #dce7ff; border: 1px solid rgba(165,190,232,0.18); }
        .gameTimePill { flex: 0 0 auto; display: inline-flex; align-items: center; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .chipButtonActive { background: linear-gradient(180deg, #3d88f6 0%, #2a67d8 100%); border-color: rgba(154,195,255,0.5); color: #fff; }
        .fieldLabel { margin: 14px 0 8px; }
        .chipRowCompact { margin-bottom: 12px; }
        .notesInput,.scoreInput { width: 100%; border-radius: 12px; border: 1px solid rgba(138,173,232,0.24); background: rgba(41,72,118,0.42); color: #f3f7ff; font-size: 14px; font-family: inherit; outline: 0; }
        .notesInput { min-height: 78px; margin: 6px 0 12px; padding: 12px; resize: none; }
        .scoreInput { min-height: 46px; margin-top: 14px; padding: 0 12px; }
        .notesInput::placeholder,.scoreInput::placeholder { color: #9db1d1; }
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
        .bottomNav { height: 74px; display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; padding: 6px 6px 10px; background: #f6f4ef; border-top: 1px solid rgba(8,23,45,0.12); }
        .navItem { width: 100%; min-height: 100%; padding: 0; border: 0; background: transparent; color: #7f8694; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; font-weight: 600; }
        .navIcon { font-size: 18px; line-height: 1; }
        @media (max-width: 520px) {
          .screen { padding: 0; background: #08172d; }
          .phoneShell { width: 100%; min-height: 100vh; border: 0; border-radius: 0; }
        }
      `}</style>
    </div>
  );
}















