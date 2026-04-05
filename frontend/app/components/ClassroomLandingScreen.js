"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

import PinballNameInput from "./PinballNameInput";
import ClassroomCameraCard from "./ClassroomCameraCard";
import RoomShell from "./RoomShell";
import RoomCoachOverlay from "./RoomCoachOverlay";

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];

const COACH_PROMPTS = [
  "What should I work on first?",
  "How should I use this room?",
  "What should I focus on next?",
];

export default function ClassroomLandingScreen({ data }) {
  const router = useRouter();
  const [machineName, setMachineName] = useState(data.machineNamePlaceholder ?? "");

  function handleBack() {
    navigateBackWithinApp(router, "/classroom");
  }

  return (
    <RoomShell title={data.title} onBack={handleBack} navItems={NAV_ITEMS} onNavigate={(href) => router.push(href)} activeNavLabel="Classroom">
      <RoomCoachOverlay
        threadKey={data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
        roomLabel={data.title}
        prompts={COACH_PROMPTS}
        placeholder={`Ask FlipperCoach about ${data.title}...`}
        emptyCopy={`Ask what to work on first, how to use ${data.title}, or what to focus on next.`}
        requestBuilder={({ draft, recentMessages, persona }) => ({
          persona,
          message: `We are in ${data.title}. User asks: ${draft}`,
          machine_name: null,
          include_location: false,
          recent_messages: recentMessages,
        })}
      />

      <main className="content">
        <section className="heroCard">
          <div className="heroImageWrap">
            <Image
              src={data.image}
              alt={data.title}
              fill
              unoptimized
              sizes="(max-width: 430px) 80vw, 320px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="heroCopy">
            <div className="heroKicker">Classroom Module</div>
            <h2>{data.title}</h2>
            <p>{data.description}</p>
          </div>
        </section>

        {data.showMachineNameInput ? (
          <section className="sectionCard machineNameCard">
            <div className="sectionKicker">Machine Setup</div>
            <label className="machineLabel" htmlFor="machine-name-input">
              Enter Pinball Name
            </label>
            <PinballNameInput
              id="machine-name-input"
              value={machineName}
              onValueChange={setMachineName}
              placeholder="Enter machine name"
              actionLabel="Use machine name"
            />
          </section>
        ) : null}

        <ClassroomCameraCard
          storageKey={`flipperiq-classroom-camera-${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          title={`${data.title} Photo Reference`}
          hint={`Capture a machine, rules card, or detail you want to reference while working in ${data.title}.`}
        />

        <section className="sectionCard">
          <div className="sectionKicker">Focus Areas</div>
          <div className="pillGrid">
            {data.focusAreas.map((item) => (
              <div key={item} className="focusPill">{item}</div>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionKicker">What You Work On</div>
          <div className="infoList">
            {data.drills.map((item) => (
              <div key={item.title} className="infoRow">
                <div className="infoTitle">{item.title}</div>
                <div className="infoCopy">{item.copy}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionKicker">Suggested Outcome</div>
          <div className="resultCard">
            <div className="resultTitle">By the end of this block</div>
            <div className="resultCopy">{data.outcome}</div>
          </div>
          <button type="button" className="primaryButton" onClick={() => router.push("/session")}>
            Start Practice Session
          </button>
        </section>
      </main>

      <style jsx>{`
        .content {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px 12px;
          display: grid;
          gap: 14px;
        }

        .heroCard,
        .sectionCard {
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

        .heroImageWrap {
          position: relative;
          width: 100%;
          aspect-ratio: 316 / 296;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
        }

        .heroKicker,
        .sectionKicker {
          color: #9dc4ff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h2 {
          margin: 6px 0 0;
          font-size: 20px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .heroCopy p {
          margin: 10px 0 0;
          color: #c5d5ee;
          font-size: 14px;
          line-height: 1.45;
        }

        .sectionCard {
          padding: 14px;
        }

        .machineNameCard {
          display: grid;
          gap: 8px;
        }

        .machineLabel {
          color: #f0f5ff;
          font-size: 13px;
          font-weight: 800;
        }

        .pillGrid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .focusPill {
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(165, 190, 232, 0.18);
          color: #dce7ff;
          font-size: 12px;
          font-weight: 700;
        }

        .infoList {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }

        .infoRow {
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .infoRow:first-child {
          padding-top: 0;
          border-top: 0;
        }

        .infoTitle {
          font-size: 13px;
          font-weight: 800;
          color: #f0f5ff;
        }

        .infoCopy,
        .resultCopy {
          margin-top: 4px;
          color: #c5d5ee;
          font-size: 13px;
          line-height: 1.45;
        }

        .resultCard {
          margin-top: 10px;
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(165, 190, 232, 0.16);
        }

        .resultTitle {
          font-size: 13px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .primaryButton {
          width: 100%;
          min-height: 44px;
          margin-top: 12px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }
      `}</style>
    </RoomShell>
  );
}


