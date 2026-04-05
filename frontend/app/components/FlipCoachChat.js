"use client";

import Image from "next/image";

const QUICK_REPLIES = [
  "Why did I tilt?",
  "Start next lesson",
  "How will I know?",
  "Give me another tip",
];

export default function FlipCoachChat({
  isOpen,
  messages,
  draft,
  onDraftChange,
  onSend,
  onQuickReply,
  onClose,
  threadRef,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="chatOverlay">
      <div className="chatBackdrop" onClick={onClose} />
      <div className="chatPanel">
        <div className="chatHeader">
          <button type="button" className="chatBackButton" onClick={onClose} aria-label="Close chat">
            &#8249;
          </button>
          <div className="chatHeaderTitle">FlipCoach</div>
          <div className="chatHeaderAvatar">
            <Image src="/tilt-lab/flipcoach-avatar.png" alt="FlipCoach" fill sizes="52px" style={{ objectFit: "cover" }} />
          </div>
        </div>

        <div className="chatCoachCard">
          <div className="chatCoachAvatar">
            <Image src="/tilt-lab/flipcoach-avatar.png" alt="FlipCoach avatar" fill sizes="56px" style={{ objectFit: "cover" }} />
          </div>
          <div className="chatCoachMeta">
            <div className="chatCoachName">FlipCoach</div>
            <div className="chatCoachRole">AI Coach</div>
          </div>
          <button type="button" className="chatCloseButton" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </div>

        <div className="chatThread" ref={threadRef}>
          {messages.map((message) => (
            <div key={message.id} className={`chatBubbleWrap ${message.sender === "You" ? "chatBubbleWrapUser" : ""}`}>
              <div className={`chatBubble ${message.sender === "You" ? "chatBubbleUser" : ""}`}>
                {message.text}
              </div>
              <div className="chatTimestamp">{message.time}</div>
            </div>
          ))}
        </div>

        <div className="chatQuickReplies">
          {QUICK_REPLIES.map((reply) => (
            <button key={reply} type="button" className="chatQuickReply" onClick={() => onQuickReply(reply)}>
              {reply}
            </button>
          ))}
        </div>

        <div className="chatComposer">
          <button type="button" className="chatEmojiButton" aria-label="Emoji">
            ☺
          </button>
          <input
            type="text"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Type a message..."
          />
          <button type="button" className="chatSendButton" onClick={onSend} aria-label="Send">
            ➤
          </button>
        </div>
      </div>

      <style jsx>{`
        .chatOverlay {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 72px 14px 118px;
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
          min-height: 520px;
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
          grid-template-columns: 36px 1fr 52px;
          align-items: center;
          gap: 8px;
          padding: 14px 14px 12px;
          border-bottom: 1px solid rgba(144, 177, 234, 0.16);
          background: linear-gradient(180deg, rgba(28, 54, 102, 0.95), rgba(18, 35, 71, 0.95));
        }

        .chatBackButton,
        .chatCloseButton,
        .chatQuickReply,
        .chatSendButton,
        .chatEmojiButton {
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .chatBackButton {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: #8fc2ff;
          font-size: 24px;
          line-height: 1;
        }

        .chatHeaderTitle {
          text-align: center;
          font-size: 18px;
          font-weight: 800;
          color: #f4f7ff;
        }

        .chatHeaderAvatar,
        .chatCoachAvatar {
          position: relative;
          overflow: hidden;
          border-radius: 50%;
          border: 1px solid rgba(109, 175, 255, 0.42);
          box-shadow: 0 0 0 3px rgba(67, 126, 210, 0.18);
        }

        .chatHeaderAvatar {
          width: 52px;
          height: 52px;
        }

        .chatCoachCard {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr) 28px;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-bottom: 1px solid rgba(144, 177, 234, 0.1);
        }

        .chatCoachAvatar {
          width: 56px;
          height: 56px;
        }

        .chatCoachName {
          font-size: 18px;
          font-weight: 800;
          color: #f3f7ff;
        }

        .chatCoachRole {
          margin-top: 2px;
          font-size: 14px;
          color: #56afff;
        }

        .chatCloseButton {
          width: 28px;
          height: 28px;
          border: 0;
          background: transparent;
          color: #8fb7ff;
          font-size: 28px;
          line-height: 1;
        }

        .chatThread {
          min-height: 0;
          overflow-y: auto;
          display: grid;
          gap: 10px;
          padding: 12px 12px 10px;
          scrollbar-width: thin;
        }

        .chatBubbleWrap {
          display: grid;
          justify-items: start;
          gap: 4px;
        }

        .chatBubbleWrapUser {
          justify-items: end;
        }

        .chatBubble {
          max-width: 82%;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(24, 41, 76, 0.95);
          color: #d9e7ff;
          font-size: 14px;
          line-height: 1.45;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .chatBubbleUser {
          background: linear-gradient(180deg, rgba(52, 104, 191, 0.95), rgba(31, 76, 158, 0.95));
          color: #f6fbff;
        }

        .chatTimestamp {
          padding: 0 4px;
          font-size: 11px;
          color: #7e93b9;
        }

        .chatQuickReplies {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 12px 10px;
        }

        .chatQuickReply {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(108, 141, 206, 0.22);
          background: rgba(20, 35, 66, 0.92);
          color: #c5d9ff;
          font-size: 13px;
          font-weight: 700;
        }

        .chatComposer {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr) 38px;
          gap: 8px;
          align-items: center;
          padding: 0 12px 12px;
        }

        .chatComposer input {
          width: 100%;
          min-width: 0;
          min-height: 38px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(108, 141, 206, 0.2);
          background: rgba(17, 31, 60, 0.98);
          color: #edf4ff;
          font-size: 14px;
          outline: 0;
        }

        .chatComposer input::placeholder {
          color: #7f93bb;
        }

        .chatEmojiButton,
        .chatSendButton {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(108, 141, 206, 0.18);
          background: rgba(18, 34, 66, 0.98);
          color: #8dc6ff;
          font-size: 18px;
          line-height: 1;
        }

        .chatSendButton {
          background: linear-gradient(180deg, #2877f0 0%, #1f60d6 100%);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}
