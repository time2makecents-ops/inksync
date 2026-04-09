"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import { useEffect, useState } from "react";
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
export default function PrepareSessionScreen() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [gameName, setGameName] = useState("");
  const [playType, setPlayType] = useState("Solo");
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    setLocationEnabled(window.localStorage.getItem("flipperiq-location-enabled") === "true");
  }, []);

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

  return (
    <RoomShell
      title="Prepare for Session"
      onBack={handleBack}
      navItems={NAV_ITEMS}
      onNavigate={(href) => router.push(href)}
    >
        <form className="content" onSubmit={handleSubmit}>
          <section className="heroCard">
            <div className="heroArt">
              <Image src="/classroom/video-room.png" alt="Prepare Session" fill sizes="120px" style={{ objectFit: "contain", objectPosition: "left top" }} />
            </div>

            <div className="heroContent">
              <div className="heroTitle">Prepare Session</div>
              <div className="heroSubtitle">Session Setup</div>
              <div className="heroMessage">Set the machine, game, and play mode before the ball starts so the session opens with the right context.</div>
            </div>

            <div className="heroBubble">Set location, game, and play type here before you start a session.</div>
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











