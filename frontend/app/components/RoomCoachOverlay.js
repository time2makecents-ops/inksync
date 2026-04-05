"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { apiCoachChat } from "../../lib/api";
import { getOtherCoachThreadContext, loadCoachThread, saveCoachThread } from "../../lib/coachThreads";

const DEFAULT_COACH_NAME = "FlipperCoach";
const DEFAULT_PERSONA = "PinCoach";
const DEFAULT_AVATAR_SRC = "/tilt-lab/flipcoach-avatar.png";

function createMessage(id, speaker, text, pending = false) {
  return {
    id,
    speaker,
    text,
    pending,
    createdAt: Date.now(),
  };
}

export default function RoomCoachOverlay({
  threadKey,
  roomLabel,
  coachRole,
  prompts,
  placeholder,
  emptyCopy,
  requestBuilder,
  coachName = DEFAULT_COACH_NAME,
  avatarSrc = DEFAULT_AVATAR_SRC,
}) {
  const coachThreadRef = useRef(null);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [coachDraft, setCoachDraft] = useState("");
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachPendingCount, setCoachPendingCount] = useState(0);
  const [chatError, setChatError] = useState("");
  const [isThreadHydrated, setIsThreadHydrated] = useState(false);

  useEffect(() => {
    if (!threadKey) {
      setIsThreadHydrated(true);
      return;
    }

    const loaded = loadCoachThread(threadKey, { roomLabel });
    setCoachMessages(loaded.messages);
    setCoachDraft(loaded.draft);
    setIsThreadHydrated(true);
  }, [roomLabel, threadKey]);

  useEffect(() => {
    if (!threadKey || !isThreadHydrated) {
      return;
    }

    saveCoachThread(threadKey, {
      roomLabel,
      messages: coachMessages,
      draft: coachDraft,
    });
  }, [coachDraft, coachMessages, isThreadHydrated, roomLabel, threadKey]);

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
    if (!trimmedDraft || coachPendingCount) {
      return;
    }

    const requestId = `coach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMessage = createMessage(`${requestId}-user`, "You", trimmedDraft);
    const pendingMessage = createMessage(`${requestId}-pending`, coachName, "...", true);
    const recentMessages = [...coachMessages, userMessage]
      .filter((entry) => !entry.pending)
      .slice(-6)
      .map((entry) => ({ speaker: entry.speaker, text: entry.text }));

    setCoachMessages((current) => [...current, userMessage, pendingMessage]);
    setCoachPendingCount((current) => current + 1);
    setCoachDraft("");
    setChatError("");

    try {
      const otherThreadContext = threadKey ? getOtherCoachThreadContext(threadKey) : "";
      const payload = requestBuilder({
        draft: trimmedDraft,
        recentMessages,
        persona: DEFAULT_PERSONA,
        otherThreadContext,
      });

      const response = await apiCoachChat({
        ...payload,
        message: otherThreadContext
          ? `${payload.message}

Other room coach context:
${otherThreadContext}`
          : payload.message,
      });

      setCoachMessages((current) => current.map((entry) => (
        entry.id === pendingMessage.id
          ? {
              ...entry,
              speaker: coachName,
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
      setChatError(message);
    } finally {
      setCoachPendingCount((current) => Math.max(0, current - 1));
    }
  }

  return (
    <>
      {!isCoachOpen ? (
        <div className="floatingCoachLayer">
          <button type="button" className="floatingCoachButton" aria-label={`Open ${coachName} chat`} onClick={() => setIsCoachOpen(true)}>
            <div className="floatingCoachAvatar">
              <Image src={avatarSrc} alt={`${coachName} avatar`} fill sizes="58px" style={{ objectFit: "contain", objectPosition: "center" }} />
            </div>
          </button>
        </div>
      ) : null}

      {isCoachOpen ? (
        <div className="coachOverlay">
          <div className="coachBackdrop" onClick={() => setIsCoachOpen(false)} />
          <div className="coachPanel">
            <div className="coachHeader">
              <button type="button" className="coachBackButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>
                &#8249;
              </button>
              <div className="coachHeaderTitle">{coachName}</div>
              <div className="coachHeaderAvatar">
                <Image src={avatarSrc} alt={`${coachName} avatar`} fill sizes="52px" style={{ objectFit: "contain", objectPosition: "center" }} />
              </div>
            </div>

            <div className="coachCoachRow">
              <div className="coachCoachAvatar">
                <Image src={avatarSrc} alt={`${coachName} avatar`} fill sizes="56px" style={{ objectFit: "contain", objectPosition: "center" }} />
              </div>
              <div className="coachCoachMeta">
                <div className="coachCoachName">{coachName}</div>
                <div className="coachCoachRole">{coachRole ?? `${roomLabel} Coach`}</div>
              </div>
              <button type="button" className="coachCloseButton" aria-label="Close chat" onClick={() => setIsCoachOpen(false)}>
                ×
              </button>
            </div>

            <div className="coachPromptRow">
              {prompts.map((prompt) => (
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
                <div className="coachEmpty">{emptyCopy}</div>
              )}
            </div>

            <div className="composerRow coachComposerRow">
              <input
                type="text"
                aria-label="Type your message"
                placeholder={placeholder}
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
                disabled={!coachDraft.trim() || coachPendingCount > 0}
              >
                {coachPendingCount ? "..." : "\u27A4"}
              </button>
            </div>
            {chatError ? <div className="chatError">{chatError}</div> : null}
          </div>
        </div>
      ) : null}

      <style jsx>{`
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

        .coachPromptChip {
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

        .composerRow input::placeholder {
          color: #9db1d1;
        }

        .sendButton {
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%);
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
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
      `}</style>
    </>
  );
}



