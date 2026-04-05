"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import Image from "next/image";

import { apiCoachChat } from "../../lib/api";
import { formatHandedness, getStoredHandedness, setStoredHandedness } from "../../lib/userPreferences";
import ClassroomCameraCard from "./ClassroomCameraCard";
import { getOtherCoachThreadContext, loadCoachThread, saveCoachThread } from "../../lib/coachThreads";

const CLASSROOM_TILES = [
  {
    title: "Shot Lab",
    image: "/classroom/shot-lab.png",
    href: "/classroom/shot-lab",
  },
  {
    title: "Tilt Lab",
    image: "/classroom/tilt-lab.png",
    href: "/classroom/tilt-lab",
  },
  {
    title: "Machine Mastery",
    image: "/classroom/machine-mastery.png",
    href: "/classroom/machine-mastery",
  },
  {
    title: "Video Room",
    image: "/classroom/video-room.png",
    href: "/classroom/video-room",
  },
  {
    title: "Repair Lab",
    image: "/classroom/repair-lab.png",
    href: "/classroom/repair-lab",
  },
  {
    title: "Games & Tournaments",
    image: "/classroom/games-tournaments.png",
    href: "/classroom/games-tournaments",
  },
];

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];

const COACH_NAME = "FlipperCoach";
const COACH_PERSONA = "PinCoach";
const THREAD_KEY = "classroom";

const COACH_PROMPTS = [
  "Which room should I start with?",
  "How do I structure a practice block?",
  "What should I focus on this week?",
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

export default function ClassroomScreen() {
  const router = useRouter();
  const [coachMessage, setCoachMessage] = useState("");
  const [handedness, setHandedness] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isThreadHydrated, setIsThreadHydrated] = useState(false);
  const chatThreadRef = useRef(null);

  useEffect(() => {
    setHandedness(getStoredHandedness());
  }, []);

  useEffect(() => {
    const loaded = loadCoachThread(THREAD_KEY, { roomLabel: "Classroom" });
    setChatMessages(loaded.messages);
    setCoachMessage(loaded.draft);
    setIsThreadHydrated(true);
  }, []);

  useEffect(() => {
    if (!isThreadHydrated) {
      return;
    }

    saveCoachThread(THREAD_KEY, {
      roomLabel: "Classroom",
      messages: chatMessages,
      draft: coachMessage,
    });
  }, [chatMessages, coachMessage, isThreadHydrated]);

  useEffect(() => {
    if (!isCoachOpen || !chatThreadRef.current) {
      return;
    }

    const thread = chatThreadRef.current;
    const frameId = window.requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [chatMessages, isCoachOpen]);

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

  async function handleSend() {
    const trimmedMessage = coachMessage.trim();
    if (!trimmedMessage || isSending) {
      return;
    }

    const requestId = `coach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMessage = createMessage(`${requestId}-user`, "You", trimmedMessage);
    const pendingMessage = createMessage(`${requestId}-pending`, COACH_NAME, "...", true);

    setChatMessages((current) => [...current, userMessage, pendingMessage]);
    setCoachMessage("");
    setChatError("");
    setIsSending(true);

    try {
      const otherThreadContext = getOtherCoachThreadContext(THREAD_KEY);
      const response = await apiCoachChat({
        persona: COACH_PERSONA,
        message: `We are in Classroom. User handedness: ${handedness || "not set"}. User asks: ${trimmedMessage}${otherThreadContext ? `

Other room coach context:
${otherThreadContext}` : ""}`,
        machine_name: null,
        include_location: false,
        recent_messages: [...chatMessages, userMessage]
          .filter((entry) => !entry.pending)
          .slice(-6)
          .map((entry) => ({ speaker: entry.speaker, text: entry.text })),
      });

      setChatMessages((current) => current.map((entry) => (
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
      setChatMessages((current) => current.map((entry) => (
        entry.id === pendingMessage.id
          ? {
              ...entry,
              text: message,
              pending: false,
            }
          : entry
      )));
      setChatError(message);
    } finally {
      setIsSending(false);
    }
  }

  function updateHandedness(nextHandedness) {
    setStoredHandedness(nextHandedness);
    setHandedness(nextHandedness);
  }

  function handleBack() {
    navigateBackWithinApp(router, "/");
  }

  return (
    <div className="screen">
      <div className="phoneShell">
        <header className="topBar">
          <button type="button" className="navArrow" aria-label="Back" onClick={handleBack}>
            &#8249;
          </button>
          <h1>Classroom</h1>
          <div className="spacer" />
        </header>

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
          <section className="tileGrid" aria-label="Classroom modules">
            {CLASSROOM_TILES.map((room, index) => (
              <button key={room.title} type="button" className="tileButton" aria-label={room.title} onClick={() => router.push(room.href)}>
                <div className="tileCard">
                  <div className="tile">
                    <Image
                      src={room.image}
                      alt={room.title}
                      fill
                      priority={index === 0}
                      unoptimized
                      sizes="(max-width: 430px) 44vw, 172px"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </section>

          <ClassroomCameraCard storageKey="flipperiq-classroom-camera-hub" title="Classroom Photo Reference" hint="Use the camera anywhere in Classroom to capture a machine, score display, rule card, or setup note." />

          {!handedness ? (
            <section className="coachPrefCard">
              <div className="coachPrefTitle">PinCoach needs your handedness before building drills.</div>
              <div className="coachPrefCopy">Choose your dominant hand once and coaching will keep using it for skill-building advice.</div>
              <div className="coachPrefButtons">
                <button type="button" className="coachPrefButton" onClick={() => updateHandedness("left")}>I am left-handed</button>
                <button type="button" className="coachPrefButton" onClick={() => updateHandedness("right")}>I am right-handed</button>
              </div>
            </section>
          ) : (
            <section className="coachPrefCard coachPrefCardSaved">
              <div className="coachPrefTitle">Coaching handedness: {formatHandedness(handedness)}</div>
              <div className="coachPrefCopy">PinCoach will use this when suggesting side-to-side skill work.</div>
            </section>
          )}
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
                  <div className="coachCoachRole">Classroom Coach</div>
                </div>
                <button type="button" className="coachCloseButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>
                  ×
                </button>
              </div>

              <div className="coachPromptRow">
                {COACH_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className="coachPromptChip" onClick={() => setCoachMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="coachThread" ref={chatThreadRef}>
                {chatMessages.length ? (
                  chatMessages.map((entry) => (
                    <div key={entry.id} className={`coachLine ${entry.speaker === "You" ? "coachLineUser" : ""}`}>
                      <div className={`coachBubble ${entry.speaker === "You" ? "coachBubbleUser" : ""}`}>{entry.text}</div>
                      <div className="coachMeta">{entry.speaker}</div>
                    </div>
                  ))
                ) : (
                  <div className="coachEmpty">Ask which room to start with, how to structure a practice block, or what to focus on next.</div>
                )}
              </div>

              <div className="composerRow coachComposerRow">
                <input
                  type="text"
                  value={coachMessage}
                  onChange={(event) => setCoachMessage(event.target.value)}
                  placeholder={`Ask ${COACH_NAME} about classroom training...`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button type="button" className="sendButton" onClick={handleSend} disabled={isSending || !coachMessage.trim()}>
                  {isSending ? "..." : "\u27A4"}
                </button>
              </div>
              {chatError ? <div className="chatError">{chatError}</div> : null}
            </div>
          </div>
        ) : null}

        <nav className="bottomNav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`navItem ${item.label === "Classroom" ? "navItemActive" : ""} ${!item.href ? "navItemDisabled" : ""}`}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
              disabled={!item.href}
            >
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
      </div>

      <style jsx>{`
        .screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f3f5f8;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .phoneShell {
          width: 390px;
          max-width: 100%;
          min-height: 812px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 34px;
          border: 8px solid #05070d;
          background:
            radial-gradient(circle at top, rgba(50, 87, 150, 0.34), rgba(16, 38, 73, 0) 32%),
            linear-gradient(180deg, #102649 0%, #08172d 100%);
          color: #f3f7ff;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.28);
        }

        .topBar {
          min-height: 92px;
          display: grid;
          grid-template-columns: 40px 1fr 40px;
          align-items: center;
          padding: 28px 18px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(19, 43, 81, 0.92), rgba(16, 38, 73, 0.76));
        }

        h1 {
          margin: 0;
          text-align: center;
          align-self: center;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .navArrow,
        .tileButton,
        .navItem {
          cursor: pointer;
        }

        .navArrow {
          width: 36px;
          height: 36px;
          align-self: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #d7e4ff;
          font-size: 24px;
          line-height: 1;
        }

        .spacer {
          width: 40px;
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
          -webkit-tap-highlight-color: transparent;
        }

        .floatingCoachAvatar {
          position: absolute;
          inset: 5px;
          overflow: hidden;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, rgba(10, 19, 42, 0.9), rgba(4, 10, 24, 0.98));
        }

        .content {
          flex: 1;
          display: grid;
          gap: 14px;
          padding: 12px 16px 8px;
          overflow-y: auto;
        }

        .tileGrid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 12px;
          align-content: start;
        }

        .tileButton {
          padding: 0;
          border: 0;
          background: transparent;
          text-align: left;
        }

        .tileButton:focus-visible {
          outline: none;
        }

        .tileButton:hover .tileCard,
        .tileButton:focus-visible .tileCard {
          transform: translateY(-2px);
          border-color: rgba(190, 214, 255, 0.64);
          box-shadow: 0 14px 22px rgba(0, 0, 0, 0.36);
        }

        .tileCard {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(164, 188, 229, 0.36);
          background: rgba(16, 38, 73, 0.2);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
        }

        .tile {
          width: 100%;
          aspect-ratio: 316 / 296;
          position: relative;
        }

        .coachPrefCard {
          min-width: 0;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.88), rgba(12, 24, 46, 0.96));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
          display: grid;
          gap: 8px;
        }

        .coachPrefCardSaved {
          border-color: rgba(96, 185, 255, 0.32);
        }

        .coachPrefTitle {
          color: #f7f4e6;
          font-size: 14px;
          font-weight: 800;
        }

        .coachPrefCopy {
          color: #c5d5ee;
          font-size: 13px;
          line-height: 1.4;
        }

        .coachPrefButtons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .coachPrefButton, .coachPromptChip {
          min-height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(165, 190, 232, 0.2);
          background: rgba(16, 31, 58, 0.72);
          color: #dce7ff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
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
          grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;
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

        .coachHeaderAvatar,
        .coachCoachAvatar {
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

        .coachPromptRow {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 0 12px 10px;
          scrollbar-width: none;
        }

        .coachPromptRow::-webkit-scrollbar {
          display: none;
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
          color: #8fb7ff;
          font-size: 12px;
          font-weight: 700;
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

        .composerRow input {
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

        .composerRow input::placeholder {
          color: #9db1d1;
        }

        .sendButton {
          min-height: 40px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%);
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
        }

        .sendButton:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .chatError {
          padding: 0 12px 12px;
          color: #ffb6b6;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.25;
        }

        .bottomNav {
          height: 74px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          padding: 6px 6px 10px;
          background: linear-gradient(180deg, rgba(14, 30, 57, 0.95), rgba(9, 20, 39, 0.98));
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .navItem {
          width: 100%;
          min-height: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: #b7bfd0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          appearance: none;
        }

        .navItemActive {
          color: #68a9ff;
        }

        .navItemDisabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .navIcon {
          font-size: 18px;
          line-height: 1;
        }

        @media (max-width: 520px) {
          .screen {
            padding: 0;
            background:
              radial-gradient(circle at top, rgba(50, 87, 150, 0.34), rgba(16, 38, 73, 0) 32%),
              linear-gradient(180deg, #102649 0%, #08172d 100%);
          }

          .phoneShell {
            width: 100vw;
            max-width: 100vw;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}



