"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

import { apiCoachChat } from "../../lib/api";
import PinballNameInput from "./PinballNameInput";
import ClassroomCameraCard from "./ClassroomCameraCard";
import RoomShell from "./RoomShell";
import { getOtherCoachThreadContext, loadCoachThread, saveCoachThread } from "../../lib/coachThreads";

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];

const VIDEO_MODES = [
  { key: "general", label: "General Skill Building" },
  { key: "machine", label: "Specific Game" },
];

const FOCUS_AREAS = [
  "Control",
  "Skill Shots",
  "Tilt",
  "Game Play",
  "Multiball",
  "Nudging",
  "Mode Starts",
  "Ball Saves",
  "Shot Accuracy",
  "Feeds and Returns",
];

const YOUTUBE_CARDS = {
  Control: [
    { title: "Controlled Flipper Skills", subtitle: "Catch, cradle, and release timing", channel: "YouTube search" },
    { title: "Live Ball Control Examples", subtitle: "Watch how stronger players settle chaos", channel: "YouTube search" },
    { title: "Feed Recovery Reps", subtitle: "Study how players survive awkward returns", channel: "YouTube search" },
  ],
  "Skill Shots": [
    { title: "Skill Shot Recognition", subtitle: "Different launch objectives across machines", channel: "YouTube search" },
    { title: "Plunge Control Clips", subtitle: "How players aim the first touch", channel: "YouTube search" },
    { title: "Opening Ball Priorities", subtitle: "What good players try to secure first", channel: "YouTube search" },
  ],
  Tilt: [
    { title: "Nudge Timing Examples", subtitle: "Watch legal saves and recovery nudges", channel: "YouTube search" },
    { title: "Tilt Warning Discipline", subtitle: "How players avoid burning through warnings", channel: "YouTube search" },
    { title: "Body Position and Recovery", subtitle: "Stay calm when the machine gets wild", channel: "YouTube search" },
  ],
  "Game Play": [
    { title: "Full Game Walkthroughs", subtitle: "See pacing across an entire strong game", channel: "YouTube search" },
    { title: "Decision Point Reviews", subtitle: "Pause and predict what the next choice should be", channel: "YouTube search" },
    { title: "Mode Progression Examples", subtitle: "Watch how stronger players sequence objectives", channel: "YouTube search" },
  ],
  Multiball: [
    { title: "Multiball Control", subtitle: "How players calm the chaos first", channel: "YouTube search" },
    { title: "Jackpot Priority Study", subtitle: "Learn what gets collected first and why", channel: "YouTube search" },
    { title: "Survival Before Scoring", subtitle: "See the balance between control and aggression", channel: "YouTube search" },
  ],
  Nudging: [
    { title: "Micro-Nudge Examples", subtitle: "Small saves instead of panic shoves", channel: "YouTube search" },
    { title: "Outlane Save Study", subtitle: "When a nudge changes the result", channel: "YouTube search" },
    { title: "Recovery Without Tilt", subtitle: "Watch players thread the line cleanly", channel: "YouTube search" },
  ],
  "Mode Starts": [
    { title: "Mode Start Planning", subtitle: "What to set up before starting value", channel: "YouTube search" },
    { title: "Safer Start Timing", subtitle: "When players delay value to keep control", channel: "YouTube search" },
    { title: "Mode Stack Examples", subtitle: "See how players avoid rushed starts", channel: "YouTube search" },
  ],
  "Ball Saves": [
    { title: "Ball Save Recognition", subtitle: "Know when players attack versus recover", channel: "YouTube search" },
    { title: "Save Window Management", subtitle: "How players use the timer wisely", channel: "YouTube search" },
    { title: "Post-Save Recovery", subtitle: "What to do right after a save fires", channel: "YouTube search" },
  ],
  "Shot Accuracy": [
    { title: "Repeatable Shot Mechanics", subtitle: "Watch release timing and setup discipline", channel: "YouTube search" },
    { title: "Miss Pattern Review", subtitle: "How better players correct a repeated miss", channel: "YouTube search" },
    { title: "Confidence Through Setup", subtitle: "Accuracy usually starts before the flip", channel: "YouTube search" },
  ],
  "Feeds and Returns": [
    { title: "Fast Return Preparation", subtitle: "Track what players do before the feed arrives", channel: "YouTube search" },
    { title: "Dangerous Feed Recovery", subtitle: "Learn how strong players reset the ball", channel: "YouTube search" },
    { title: "Catch Versus Redirect", subtitle: "When to settle and when to keep flow", channel: "YouTube search" },
  ],
};

const THREAD_KEY = "video-room";

const COACH_NAME = "FlipperCoach";
const COACH_PERSONA = "PinCoach";
const COACH_PROMPTS = [
  "What videos should I start with?",
  "What search phrase should I use?",
  "What should I study before playing?",
];

function createMessage(id, speaker, text, pending = false) {
  return {
    id,
    speaker,
    text,
    pending,
    createdAt: Date.now(),
  };
}

export default function VideoRoomScreen() {
  const router = useRouter();
  const coachThreadRef = useRef(null);
  const [videoMode, setVideoMode] = useState("general");
  const [focusArea, setFocusArea] = useState("Control");
  const [machineName, setMachineName] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachDraft, setCoachDraft] = useState("");
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachPendingCount, setCoachPendingCount] = useState(0);
  const [isThreadHydrated, setIsThreadHydrated] = useState(false);


  useEffect(() => {
    const loaded = loadCoachThread(THREAD_KEY, { roomLabel: "Video Room" });
    setCoachMessages(loaded.messages);
    setCoachDraft(loaded.draft);
    setIsThreadHydrated(true);
  }, []);

  useEffect(() => {
    if (!isThreadHydrated) {
      return;
    }

    saveCoachThread(THREAD_KEY, {
      roomLabel: "Video Room",
      messages: coachMessages,
      draft: coachDraft,
    });
  }, [coachDraft, coachMessages, isThreadHydrated]);

  function handleBack() {
    navigateBackWithinApp(router, "/classroom");
  }

  async function handleAssistantSubmit(event) {
    event?.preventDefault();
    const trimmedQuery = assistantQuery.trim();
    if (!trimmedQuery || assistantLoading) {
      return;
    }

    setAssistantLoading(true);
    setAssistantError("");

    try {
      const response = await apiCoachChat({
        persona: COACH_PERSONA,
        message: `Help me find the right pinball videos. Focus: ${focusArea}. Mode: ${videoMode}. Machine: ${machineName.trim() || "general"}. Request: ${trimmedQuery}`,
        machine_name: videoMode === "machine" && machineName.trim() ? machineName.trim() : null,
        include_location: false,
        recent_messages: [],
      });

      setAssistantReply(response.reply);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : "Assistant reply failed.");
    } finally {
      setAssistantLoading(false);
    }
  }

  useEffect(() => {
    if (!isCoachOpen || !coachThreadRef.current) {
      return;
    }

    const thread = coachThreadRef.current;
    const frameId = window.requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [coachMessages, isCoachOpen]);

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

  async function handleCoachSend() {
    const trimmedDraft = coachDraft.trim();
    if (!trimmedDraft) {
      return;
    }

    const requestId = `coach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMessage = createMessage(`${requestId}-user`, "You", trimmedDraft);
    const pendingMessage = createMessage(`${requestId}-pending`, COACH_NAME, "...", true);

    setCoachMessages((current) => [...current, userMessage, pendingMessage]);
    setCoachPendingCount((current) => current + 1);
    setCoachDraft("");

    try {
      const otherThreadContext = getOtherCoachThreadContext(THREAD_KEY);
      const response = await apiCoachChat({
        persona: COACH_PERSONA,
        message: `We are in Video Room. Focus: ${focusArea}. Mode: ${videoMode}. Machine: ${machineName.trim() || "general"}. User asks: ${trimmedDraft}${otherThreadContext ? `

Other room coach context:
${otherThreadContext}` : ""}`,
        machine_name: videoMode === "machine" && machineName.trim() ? machineName.trim() : null,
        include_location: false,
        recent_messages: [...coachMessages, userMessage]
          .filter((entry) => !entry.pending)
          .slice(-6)
          .map((entry) => ({ speaker: entry.speaker, text: entry.text })),
      });

      setCoachMessages((current) => current.map((entry) => (
        entry.id === pendingMessage.id
          ? {
              ...entry,
              speaker: COACH_NAME,
              text: response.reply,
              pending: false,
            }
          : entry
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Coach reply failed.";
      setCoachMessages((current) => current.map((entry) => (
        entry.id === pendingMessage.id
          ? {
              ...entry,
              text: message,
              pending: false,
            }
          : entry
      )));
    } finally {
      setCoachPendingCount((current) => Math.max(0, current - 1));
    }
  }

  const videoResults = useMemo(() => {
    const baseCards = YOUTUBE_CARDS[focusArea] ?? YOUTUBE_CARDS.Control;
    return baseCards.map((card, index) => {
      const queryParts = [
        videoMode === "machine" && machineName.trim() ? machineName.trim() : "pinball",
        focusArea,
        "pinball",
      ].filter(Boolean);

      return {
        ...card,
        title: videoMode === "machine" && machineName.trim() ? `${machineName.trim()} ${card.title}` : card.title,
        href: `https://www.youtube.com/results?search_query=${encodeURIComponent(queryParts.join(" "))}`,
        label: index === 0 ? "Open Search" : "Search YouTube",
      };
    });
  }, [focusArea, machineName, videoMode]);

  return (
    <RoomShell title="Video Room" onBack={handleBack} navItems={NAV_ITEMS} onNavigate={(href) => router.push(href)} activeNavLabel="Classroom">
      {!isCoachOpen ? (
        <div className="floatingCoachLayer">
          <button type="button" className="floatingCoachButton" aria-label="Open FlipperCoach chat" onClick={() => setIsCoachOpen(true)}>
            <div className="floatingCoachAvatar">
              <Image src="/tilt-lab/flipcoach-avatar.png" alt="FlipperCoach avatar" fill sizes="58px" style={{ objectFit: "contain", objectPosition: "center" }} />
            </div>
          </button>
        </div>
      ) : null}

      <main className="content">
        <section className="heroCard">
          <div className="heroArt">
            <Image src="/classroom/video-room.png" alt="Video Room" fill unoptimized sizes="(max-width: 430px) 84vw, 320px" style={{ objectFit: "contain" }} />
          </div>
          <div className="heroCopy">
            <div className="heroKicker">Classroom Module</div>
            <h2>Video Room</h2>
            <p>Study real play, pause on key decisions, and jump straight into YouTube searches that match a specific machine or a broader skill you want to build.</p>
          </div>
        </section>

        <ClassroomCameraCard storageKey="flipperiq-classroom-camera-video-room" title="Video Room Photo Reference" hint="Capture a playfield, score screen, or machine shot you want to study alongside videos." />

        <section className="sectionCard">
          <div className="sectionKicker">Search Mode</div>
          <div className="modeRow">
            {VIDEO_MODES.map((mode) => (
              <button key={mode.key} type="button" className={`modeButton ${videoMode === mode.key ? "modeButtonActive" : ""}`} onClick={() => setVideoMode(mode.key)}>
                {mode.label}
              </button>
            ))}
          </div>
          {videoMode === "machine" ? (
            <div className="machineSearchWrap">
              <label className="machineLabel" htmlFor="video-room-machine">Choose a specific game</label>
              <PinballNameInput id="video-room-machine" value={machineName} onValueChange={setMachineName} placeholder="Enter machine name" actionLabel="Use machine" />
            </div>
          ) : (
            <div className="modeHint">Leave this on general when you want broader skill-building videos instead of machine-specific clips.</div>
          )}
        </section>

        <section className="sectionCard">
          <div className="sectionKicker">Focus Area</div>
          <div className="focusScroller">
            {FOCUS_AREAS.map((item) => (
              <button key={item} type="button" className={`focusChip ${focusArea === item ? "focusChipActive" : ""}`} onClick={() => setFocusArea(item)}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionKicker">Need Something Else?</div>
          <div className="assistantTitle">Ask the AI assistant what to search for</div>
          <form className="assistantForm" onSubmit={handleAssistantSubmit}>
            <input type="text" value={assistantQuery} onChange={(event) => setAssistantQuery(event.target.value)} placeholder="I want videos about recovering from tilt warnings..." />
            <button type="submit" className="assistantButton" disabled={assistantLoading || !assistantQuery.trim()}>{assistantLoading ? "..." : "\u27A4"}</button>
          </form>
          {assistantReply ? <div className="assistantReply">{assistantReply}</div> : null}
          {assistantError ? <div className="assistantError">{assistantError}</div> : null}
        </section>

        <section className="sectionCard">
          <div className="sectionKicker">Suggested Video Searches</div>
          <div className="videoList">
            {videoResults.map((card) => (
              <a key={card.title} href={card.href} target="_blank" rel="noreferrer" className="videoCard">
                <div className="videoMeta">
                  <div className="videoTitle">{card.title}</div>
                  <div className="videoCopy">{card.subtitle}</div>
                  <div className="videoSource">{card.channel}</div>
                </div>
                <div className="videoAction">{card.label}</div>
              </a>
            ))}
          </div>
        </section>
      </main>

      {isCoachOpen ? (
        <div className="coachOverlay">
          <div className="coachBackdrop" onClick={() => setIsCoachOpen(false)} />
          <div className="coachPanel">
            <div className="coachHeader">
              <button type="button" className="coachBackButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>
                &#8249;
              </button>
              <div className="coachHeaderTitle">{COACH_NAME}</div>
              <div className="coachHeaderAvatar">
                <Image src="/tilt-lab/flipcoach-avatar.png" alt="FlipperCoach avatar" fill sizes="52px" style={{ objectFit: "contain", objectPosition: "center" }} />
              </div>
            </div>

            <div className="coachCoachRow">
              <div className="coachCoachAvatar">
                <Image src="/tilt-lab/flipcoach-avatar.png" alt="FlipperCoach avatar" fill sizes="56px" style={{ objectFit: "contain", objectPosition: "center" }} />
              </div>
              <div className="coachCoachMeta">
                <div className="coachCoachName">{COACH_NAME}</div>
                <div className="coachCoachRole">Video Room Coach</div>
              </div>
              <button type="button" className="coachCloseButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>
                ×
              </button>
            </div>

            <div className="coachPromptRow">
              {COACH_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" className="coachPromptChip" onClick={() => setCoachDraft(prompt)}>{prompt}</button>
              ))}
            </div>

            <div className="coachThread" ref={coachThreadRef}>
              {coachMessages.length ? (
                coachMessages.map((entry) => (
                  <div key={entry.id} className={`coachLine ${entry.speaker === "You" ? "coachLineUser" : ""}`}>
                    <div className={`coachBubble ${entry.speaker === "You" ? "coachBubbleUser" : ""}`}>{entry.text}</div>
                    <div className="coachMeta">{entry.speaker}</div>
                  </div>
                ))
              ) : (
                <div className="coachEmpty">Ask for a search phrase, a channel direction, or what kind of clip would help most before your next session.</div>
              )}
            </div>

            <div className="composerRow coachComposerRow">
              <input
                type="text"
                aria-label="Type your message"
                placeholder={`Ask ${COACH_NAME} what to watch...`}
                value={coachDraft}
                onChange={(event) => setCoachDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCoachSend();
                  }
                }}
              />
              <button
                type="button"
                className="sendButton"
                aria-label="Send message"
                onClick={handleCoachSend}
                disabled={!coachDraft.trim()}
              >
                {coachPendingCount ? "..." : "\u27A4"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 14px 16px 12px;
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .floatingCoachLayer {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          pointer-events: none;
        }

        .floatingCoachButton {
          position: fixed;
          top: 24px;
          right: max(15px, calc((100vw - 390px) / 2 + 15px));
          z-index: 41;
          pointer-events: auto;
          width: 62px;
          height: 62px;
          padding: 0;
          border: 1px solid rgba(139, 196, 255, 0.55);
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(94, 178, 255, 0.85), rgba(19, 54, 122, 0.98));
          box-shadow: 0 0 0 3px rgba(139, 196, 255, 0.18), 0 0 24px rgba(58, 146, 255, 0.32);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .floatingCoachAvatar {
          position: absolute;
          inset: 5px;
          overflow: hidden;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, rgba(10, 19, 42, 0.9), rgba(4, 10, 24, 0.98));
        }

        .heroCard, .sectionCard {
          min-width: 0;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.88), rgba(12, 24, 46, 0.96));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .heroCard {
          padding: 14px;
          display: grid;
          gap: 14px;
        }

        .heroArt {
          position: relative;
          width: 100%;
          aspect-ratio: 316 / 296;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
        }

        .heroKicker, .sectionKicker {
          color: #9dc4ff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h2 {
          margin: 6px 0 0;
          font-size: 22px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .heroCopy p, .modeHint, .assistantReply, .assistantError, .videoCopy {
          margin: 10px 0 0;
          color: #c5d5ee;
          font-size: 14px;
          line-height: 1.45;
        }

        .sectionCard {
          padding: 14px;
        }

        .modeRow, .focusScroller, .coachPromptRow {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          margin-top: 10px;
        }

        .modeRow::-webkit-scrollbar, .focusScroller::-webkit-scrollbar, .coachPromptRow::-webkit-scrollbar {
          display: none;
        }

        .modeButton, .focusChip, .coachPromptChip {
          flex: 0 0 auto;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: #dce7ff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .modeButtonActive, .focusChipActive {
          background: linear-gradient(180deg, rgba(76, 163, 255, 0.45), rgba(47, 121, 231, 0.28));
          border-color: rgba(143, 195, 255, 0.46);
          color: #ffffff;
        }

        .machineSearchWrap {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .machineLabel, .assistantTitle {
          color: #f0f5ff;
          font-size: 14px;
          font-weight: 800;
        }

        .assistantForm {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 46px;
          gap: 8px;
          margin-top: 10px;
        }

        .assistantForm input, .composerRow input {
          min-width: 0;
          width: 100%;
          min-height: 40px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(138, 173, 232, 0.24);
          background: rgba(41, 72, 118, 0.42);
          color: #f3f7ff;
          font-size: 14px;
          outline: 0;
        }

        .assistantForm input::placeholder, .composerRow input::placeholder {
          color: #9db1d1;
        }

        .assistantButton, .sendButton {
          border: 0;
          border-radius: 10px;
          background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .assistantButton {
          min-height: 40px;
        }

        .assistantError {
          color: #ffb6b6;
        }

        .videoList {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }

        .videoCard {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(165, 190, 232, 0.16);
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          text-decoration: none;
        }

        .videoMeta {
          min-width: 0;
        }

        .videoTitle {
          color: #f7f4e6;
          font-size: 14px;
          font-weight: 800;
        }

        .videoSource, .modeHint, .coachEmpty {
          color: #8fb7ff;
          font-size: 12px;
          font-weight: 700;
        }

        .videoAction {
          flex: 0 0 auto;
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(80, 142, 255, 0.18);
          color: #f0f5ff;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .coachOverlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 14px;
        }

        .coachBackdrop {
          position: absolute;
          inset: 0;
          background: rgba(2, 8, 20, 0.6);
          backdrop-filter: blur(3px);
        }

        .coachPanel {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 358px;
          height: min(775px, calc(100vh - 90px));
          min-height: 775px;
          max-height: calc(100vh - 90px);
          border-radius: 22px;
          border: 1px solid rgba(113, 156, 230, 0.32);
          background:
            radial-gradient(circle at top, rgba(45, 92, 168, 0.22), rgba(11, 21, 43, 0) 34%),
            linear-gradient(180deg, rgba(14, 28, 59, 0.98), rgba(7, 14, 29, 0.98));
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.38);
          display: grid;
          grid-template-rows: auto auto auto minmax(0, 1fr) auto;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        }

        .coachHeader {
          display: grid;
          grid-template-columns: 36px 1fr 52px;
          align-items: center;
          gap: 8px;
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(144, 177, 234, 0.16);
          background: linear-gradient(180deg, rgba(28, 54, 102, 0.95), rgba(18, 35, 71, 0.95));
        }

        .coachBackButton {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: #8fc2ff;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
        }

        .coachHeaderTitle {
          text-align: center;
          font-size: 18px;
          font-weight: 800;
          color: #f4f7ff;
        }

        .coachHeaderAvatar, .coachCoachAvatar {
          position: relative;
          overflow: hidden;
          border-radius: 50%;
          border: 1px solid rgba(109, 175, 255, 0.42);
          box-shadow: 0 0 0 3px rgba(67, 126, 210, 0.18);
          background: radial-gradient(circle at 50% 35%, rgba(10, 19, 42, 0.9), rgba(4, 10, 24, 0.98));
        }

        .coachHeaderAvatar {
          width: 52px;
          height: 52px;
        }

        .coachCoachRow {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) 28px;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-bottom: 1px solid rgba(144, 177, 234, 0.1);
        }

        .coachCoachAvatar {
          width: 56px;
          height: 56px;
        }

        .coachCoachName {
          font-size: 18px;
          font-weight: 800;
          color: #f3f7ff;
        }

        .coachCoachRole {
          margin-top: 2px;
          font-size: 14px;
          color: #56afff;
        }

        .coachCloseButton {
          width: 28px;
          height: 28px;
          border: 0;
          background: transparent;
          color: #8fb7ff;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
        }

        .coachThread {
          min-height: 0;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
          display: grid;
          gap: 10px;
          padding: 0 12px 10px;
          scrollbar-width: thin;
        }

        .coachLine {
          display: grid;
          justify-items: start;
          gap: 4px;
          min-width: 0;
        }

        .coachLineUser {
          justify-items: end;
        }

        .coachBubble {
          min-width: 0;
          max-width: 82%;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(24, 41, 76, 0.95);
          color: #d9e7ff;
          font-size: 14px;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .coachBubbleUser {
          background: linear-gradient(180deg, rgba(52, 104, 191, 0.95), rgba(31, 76, 158, 0.95));
          color: #f6fbff;
        }

        .coachMeta {
          padding: 0 4px;
          font-size: 11px;
          color: #7e93b9;
        }

        .coachEmpty {
          margin-top: 0;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(24, 41, 76, 0.82);
          line-height: 1.45;
        }

        .coachComposerRow {
          padding: 0 12px 12px;
        }

        .composerRow {
          display: grid;
          grid-template-columns: 1fr 48px;
          gap: 10px;
        }

        .sendButton {
          height: 40px;
          font-size: 18px;
        }

        .sendButton:disabled {
          opacity: 0.55;
          cursor: default;
        }
      `}</style>
    </RoomShell>
  );
}



