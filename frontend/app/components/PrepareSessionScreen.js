"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import { useEffect, useRef, useState } from "react";

import { apiCoachChat } from "../../lib/api";
import { getOtherCoachThreadContext, loadCoachThread, saveCoachThread } from "../../lib/coachThreads";
import ClassroomCameraCard from "./ClassroomCameraCard";
import PinballNameInput from "./PinballNameInput";
import RoomShell from "./RoomShell";

const PLAY_TYPES = ["Solo", "Practice", "Social", "Competitive"];
const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];
const QUICK_REPLIES = [
  "Give me a quick plan",
  "What should I focus on first?",
  "How should I approach game one?",
  "What should I avoid early?",
];
const INITIAL_MESSAGES = [];
const THREAD_KEY = "prepare-session";

export default function PrepareSessionScreen() {
  const router = useRouter();
  const chatThreadRef = useRef(null);
  const nextMessageIdRef = useRef(2);
  const [location, setLocation] = useState("");
  const [gameName, setGameName] = useState("");
  const [playType, setPlayType] = useState("Solo");
  const [draft, setDraft] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isThreadHydrated, setIsThreadHydrated] = useState(false);

  useEffect(() => {
    setLocationEnabled(window.localStorage.getItem("flipperiq-location-enabled") === "true");

    const loaded = loadCoachThread(THREAD_KEY, {
      roomLabel: "Prepare Session",
      initialMessages: INITIAL_MESSAGES,
    });
    setMessages(loaded.messages);
    setDraft(loaded.draft);
    setIsThreadHydrated(true);
  }, []);

  useEffect(() => {
    if (!isThreadHydrated) {
      return;
    }

    saveCoachThread(THREAD_KEY, {
      roomLabel: "Prepare Session",
      messages,
      draft,
    });
  }, [draft, isThreadHydrated, messages]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (isChatOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen || !chatThreadRef.current) {
      return;
    }

    const thread = chatThreadRef.current;
    const frameId = window.requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isChatOpen, messages]);

  function handleBack() {
    navigateBackWithinApp(router, "/");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!gameName.trim()) {
      return;
    }

    const params = new URLSearchParams({
      gameName: gameName.trim(),
      playType,
    });

    if (location.trim()) {
      params.set("location", location.trim());
    }

    router.push(`/session?${params.toString()}`);
  }

  async function sendMessage(text) {
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
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setChatError("");
    setIsSending(true);

    try {
      const otherThreadContext = getOtherCoachThreadContext(THREAD_KEY);
      const response = await apiCoachChat({
        persona: "PinCoach",
        message: `We are in Prepare Session. Game: ${gameName.trim() || "not set"}. Play type: ${playType}. Location: ${location.trim() || "not set"}. User asks: ${trimmed}${otherThreadContext ? `

Other room coach context:
${otherThreadContext}` : ""}`,
        machine_name: gameName.trim() || null,
        include_location: locationEnabled,
        recent_messages: nextMessages.slice(-6).map((entry) => ({
          speaker: entry.sender,
          text: entry.text,
        })),
      });

      setMessages((current) => [
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

  function handleSend() {
    sendMessage(draft);
  }

  return (
    <RoomShell
      title="Prepare for Session"
      onBack={handleBack}
      navItems={NAV_ITEMS}
      onNavigate={(href) => router.push(href)}
    >

        {!isChatOpen ? (
          <div className="floatingCoachLayer">
            <button type="button" className="floatingCoachButton" aria-label="Open PinCoach chat" onClick={() => setIsChatOpen(true)}>
              <div className="floatingCoachAvatar">
                <Image src="/tilt-lab/flipcoach-avatar.png" alt="PinCoach avatar" fill sizes="58px" style={{ objectFit: "contain", objectPosition: "center" }} />
              </div>
            </button>
          </div>
        ) : null}

        <form className="content" onSubmit={handleSubmit}>
          <section className="heroCard">
            <div className="heroArt">
              <Image src="/tilt-lab/flipcoach-hero.png" alt="PinCoach" fill sizes="120px" style={{ objectFit: "contain", objectPosition: "left top" }} />
            </div>

            <div className="heroContent">
              <div className="heroTitle">PinCoach</div>
              <div className="heroSubtitle">Session Setup Coach</div>
              <div className="heroMessage">Get the machine, game, and play mode set before the ball starts. Ask for one clean pre-game plan when you need it.</div>
            </div>

            <div className="heroBubble">Set location, game, and play type here. Your coach chat in this room stays tied to Prepare Session and does not appear inside other rooms.</div>
          </section>

          <section className="sectionCard upperSection">
            <label htmlFor="location" className="label">
              Location
            </label>
            <div className="inputWrap">
              <span className="pin" aria-hidden="true">
                &#128205;
              </span>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Enter Location (optional)"
              />
            </div>

            <label htmlFor="gameName" className="label">
              Game Name
            </label>
            <PinballNameInput
              id="gameName"
              value={gameName}
              onValueChange={setGameName}
              placeholder="Enter Game Name"
              actionLabel="Use game name"
              className="gameNameField"
            />

            <h2 className="label">Type of Play</h2>
            <div className="playGrid">
              {PLAY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`playButton ${playType === type ? "playButtonActive" : ""}`}
                  onClick={() => setPlayType(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <button type="submit" className="startButton" disabled={!gameName.trim()}>
              Start Playing
            </button>
          </section>

          <ClassroomCameraCard storageKey="flipperiq-session-camera-prepare" title="Prepare Session Photo Reference" hint="Capture the machine, card, or setup before you start playing." />
        </form>

        {isChatOpen ? (
          <div className="chatOverlay">
            <div className="chatBackdrop" onClick={() => setIsChatOpen(false)} />
            <div className="chatPanel">
              <div className="chatHeader">
                <button type="button" className="chatBackButton" aria-label="Close chat" onClick={() => setIsChatOpen(false)}>
                  &#8249;
                </button>
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
                  <div className="chatCoachRole">Session Setup Coach</div>
                </div>
                <button type="button" className="chatCloseButton" aria-label="Close chat" onClick={() => setIsChatOpen(false)}>
                  ×
                </button>
              </div>

              <div className="chatThread" ref={chatThreadRef}>
                {messages.length ? messages.map((message) => (
                  <div key={message.id} className={`chatMessageWrap ${message.sender === "You" ? "chatMessageWrapUser" : ""}`}>
                    <div className={`chatBubble ${message.sender === "You" ? "chatBubbleUser" : ""}`}>{message.text}</div>
                    <div className="chatTime">{message.time}</div>
                  </div>
                )) : <div className="chatEmpty">Ask for a quick plan, what to focus on first, or how to approach game one.</div>}
              </div>

              <div className="chatReplies">
                {QUICK_REPLIES.map((reply) => (
                  <button key={reply} type="button" className="chatReplyChip" onClick={() => sendMessage(reply)} disabled={isSending}>
                    {reply}
                  </button>
                ))}
              </div>

              <div className="chatComposer">
                <button type="button" className="chatEmojiButton" aria-label="Emoji">?</button>
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask PinCoach..."
                />
                <button type="button" className="chatSendButton" onClick={handleSend} disabled={isSending || !draft.trim()}>
                  {isSending ? "..." : "\u27A4"}
                </button>
              </div>
              {chatError ? <div className="chatError">{chatError}</div> : null}
            </div>
          </div>
        ) : null}

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
          position: relative;
          width: 390px;
          max-width: 100%;
          min-height: 844px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 34px;
          border: 8px solid #05070d;
          background: linear-gradient(180deg, #102649 0%, #08172d 100%);
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
        }

        h1 {
          margin: 0;
          text-align: center;
          align-self: center;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .spacer {
          width: 40px;
        }

        .navArrow,
        .floatingCoachButton,
        .chatBackButton,
        .chatCloseButton,
        .chatReplyChip,
        .chatEmojiButton,
        .chatSendButton,
        .navItem {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .navArrow {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #d7e4ff;
          font-size: 24px;
          line-height: 1;
        }

        .floatingCoachLayer {
          position: fixed;
          inset: 0;
          z-index: 40;
          pointer-events: none;
        }

        .floatingCoachButton {
          position: fixed;
          top: 72px;
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
          overflow-y: auto;
          padding: 14px 14px 12px;
          display: grid;
          gap: 12px;
        }

        .heroCard,
        .sectionCard {
          border-radius: 18px;
          border: 1px solid rgba(117, 148, 211, 0.2);
          background: linear-gradient(180deg, rgba(18, 34, 69, 0.96), rgba(9, 18, 38, 0.98));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
        }

        .heroCard {
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          gap: 10px 12px;
          padding: 12px 14px 14px;
          align-items: start;
          overflow: hidden;
        }

        .heroArt {
          position: relative;
          min-height: 116px;
          align-self: start;
        }

        .heroContent {
          min-width: 0;
          padding-top: 6px;
          padding-right: 66px;
        }

        .heroTitle {
          font-size: 20px;
          font-weight: 800;
          color: #f4f7ff;
        }

        .heroSubtitle {
          margin-top: 5px;
          font-size: 13px;
          font-weight: 700;
          color: #49aaff;
        }

        .heroMessage {
          margin-top: 12px;
          color: #d2dcee;
          font-size: 13px;
          line-height: 1.4;
        }

        .heroBubble {
          grid-column: 1 / -1;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(33, 52, 95, 0.92);
          color: #d9e7ff;
          font-size: 13px;
          line-height: 1.45;
        }

        .sectionCard {
          padding: 14px;
        }

        .label {
          display: block;
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 700;
          color: #d7e6ff;
        }

        .inputWrap {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 44px;
          padding: 0 12px;
          margin-bottom: 16px;
          border-radius: 8px;
          border: 1px solid rgba(138, 173, 232, 0.24);
          background: rgba(41, 72, 118, 0.42);
        }

        .pin {
          font-size: 14px;
          opacity: 0.88;
        }

        input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f3f7ff;
          font-size: 14px;
        }

        input::placeholder {
          color: #9db1d1;
        }

        .gameNameField {
          margin-bottom: 16px;
        }

        .playGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }

        .playButton {
          min-height: 38px;
          border: 1px solid rgba(143, 174, 224, 0.24);
          border-radius: 10px;
          background: rgba(74, 104, 147, 0.4);
          color: #edf4ff;
          font-size: 13px;
          font-weight: 700;
        }

        .playButtonActive {
          background: linear-gradient(180deg, #3d88f6 0%, #2a67d8 100%);
          border-color: rgba(154, 195, 255, 0.5);
        }

        .startButton {
          width: 100%;
          min-height: 50px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(180deg, #28c2ff 0%, #1688d9 100%);
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .startButton:disabled {
          opacity: 0.55;
          cursor: default;
          box-shadow: none;
        }

        .chatOverlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 14px;
        }

        .chatBackdrop {
          position: absolute;
          inset: 0;
          background: rgba(2, 8, 20, 0.6);
          backdrop-filter: blur(3px);
        }

        .chatPanel {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 358px;
          height: min(775px, calc(100vh - 90px));
          min-height: 0;
          min-width: 0;
          max-height: calc(100vh - 90px);
          border-radius: 22px;
          border: 1px solid rgba(113, 156, 230, 0.32);
          background:
            radial-gradient(circle at top, rgba(45, 92, 168, 0.22), rgba(11, 21, 43, 0) 34%),
            linear-gradient(180deg, rgba(14, 28, 59, 0.98), rgba(7, 14, 29, 0.98));
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.38);
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto auto;
          overflow: hidden;
        }

        .chatHeader {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) 52px;
          align-items: center;
          gap: 10px;
          padding: 12px 14px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .chatBackButton,
        .chatCloseButton,
        .chatEmojiButton,
        .chatSendButton {
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #e6efff;
        }

        .chatBackButton {
          width: 40px;
          height: 40px;
          font-size: 26px;
          line-height: 1;
        }

        .chatHeaderTitle {
          text-align: center;
          font-size: 16px;
          font-weight: 800;
          color: #f1f6ff;
        }

        .chatHeaderAvatar,
        .chatCoachAvatar {
          position: relative;
          overflow: hidden;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, rgba(10, 19, 42, 0.9), rgba(4, 10, 24, 0.98));
        }

        .chatHeaderAvatar {
          width: 52px;
          height: 52px;
          justify-self: end;
        }

        .chatCoachRow {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) 34px;
          align-items: center;
          gap: 10px;
          padding: 12px 16px 8px;
        }

        .chatCoachAvatar {
          width: 56px;
          height: 56px;
        }

        .chatCoachMeta {
          min-width: 0;
        }

        .chatCoachName {
          color: #f4f7ff;
          font-size: 16px;
          font-weight: 800;
        }

        .chatCoachRole {
          margin-top: 3px;
          color: #9fb6dd;
          font-size: 12px;
          font-weight: 700;
        }

        .chatCloseButton {
          width: 34px;
          height: 34px;
          font-size: 24px;
          line-height: 1;
        }

        .chatThread {
          min-height: 0;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 4px 16px 12px;
          display: grid;
          gap: 12px;
        }

        .chatMessageWrap {
          display: grid;
          justify-items: start;
          gap: 4px;
          min-width: 0;
        }

        .chatMessageWrapUser {
          justify-items: end;
        }

        .chatBubble {
          min-width: 0;
          max-width: 88%;
          padding: 10px 12px;
          border-radius: 16px 16px 16px 6px;
          background: rgba(24, 44, 80, 0.95);
          color: #dce7ff;
          font-size: 14px;
          line-height: 1.45;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chatBubbleUser {
          border-radius: 16px 16px 6px 16px;
          background: linear-gradient(180deg, rgba(65, 140, 255, 0.95), rgba(46, 103, 214, 0.95));
          color: #ffffff;
        }

        .chatTime {
          color: #8ca4ca;
          font-size: 11px;
          font-weight: 700;
        }

        .chatEmpty {
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(24, 44, 80, 0.82);
          color: #8fb7ff;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        .chatReplies {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 0 16px 10px;
          scrollbar-width: none;
        }

        .chatReplies::-webkit-scrollbar {
          display: none;
        }

        .chatReplyChip {
          flex: 0 0 auto;
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(123, 153, 211, 0.16);
          border-radius: 999px;
          background: rgba(18, 33, 64, 0.92);
          color: #d6e4ff;
          font-size: 12px;
          font-weight: 700;
        }

        .chatComposer {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 48px;
          gap: 8px;
          align-items: center;
          padding: 0 16px 16px;
        }

        .chatEmojiButton {
          width: 38px;
          height: 38px;
          font-size: 16px;
        }

        .chatComposer input {
          height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(123, 153, 211, 0.16);
          background: rgba(18, 33, 64, 0.92);
          color: #eff5ff;
          font-size: 14px;
        }

        .chatSendButton {
          height: 40px;
          font-size: 18px;
          font-weight: 800;
        }

        .chatSendButton:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .chatError {
          padding: 0 16px 16px;
          color: #ffb6b6;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.3;
        }

        .bottomNav {
          height: 74px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          padding: 6px 6px 10px;
          background: #f6f4ef;
          border-top: 1px solid rgba(8, 23, 45, 0.12);
        }

        .navItem {
          width: 100%;
          min-height: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: #7f8694;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          appearance: none;
        }

        .navItemDisabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .navIcon {
          font-size: 18px;
          line-height: 1;
        }

        @media (max-width: 520px) {
          .screen {
            padding: 0;
            background: #08172d;
          }

          .phoneShell {
            width: 100%;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
          }

          .floatingCoachButton {
            top: 15px;
          }
        }
      `}</style>
    </RoomShell>
  );
}











