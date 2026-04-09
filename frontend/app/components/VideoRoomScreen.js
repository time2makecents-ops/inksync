"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

import PinballNameInput from "./PinballNameInput";
import ClassroomCameraCard from "./ClassroomCameraCard";
import RoomShell from "./RoomShell";

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

export default function VideoRoomScreen() {
  const router = useRouter();
  const [videoMode, setVideoMode] = useState("general");
  const [focusArea, setFocusArea] = useState("Control");
  const [machineName, setMachineName] = useState("");

  function handleBack() {
    navigateBackWithinApp(router, "/classroom");
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

        .heroCopy p, .modeHint, .videoCopy {
          margin: 10px 0 0;
          color: #c5d5ee;
          font-size: 14px;
          line-height: 1.45;
        }

        .sectionCard {
          padding: 14px;
        }

        .modeRow, .focusScroller {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          margin-top: 10px;
        }

        .modeRow::-webkit-scrollbar, .focusScroller::-webkit-scrollbar {
          display: none;
        }

        .modeButton, .focusChip {
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

        .machineLabel {
          color: #f0f5ff;
          font-size: 14px;
          font-weight: 800;
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

        .videoSource, .modeHint {
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

      `}</style>
    </RoomShell>
  );
}



