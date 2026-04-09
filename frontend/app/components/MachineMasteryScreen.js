"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

import { apiFetch } from "../../lib/api";
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

const FOCUS_AREAS = [
  { key: "overview", label: "Game Overview", live: true },
  { key: "history", label: "History", live: true },
  { key: "instructions", label: "Instructions", live: true },
  { key: "scoringPriorities", label: "Scoring Priorities", live: false },
  { key: "saferStarts", label: "Safer Starts", live: false },
];

const UPCOMING_SECTIONS = {
  scoringPriorities: {
    title: "Scoring Priorities",
    body: "This focus area is staying visible in the layout, but it is not part of the live fetch yet. Once we add it, this section will rank the machine's major scoring paths and show which objectives deserve attention first.",
  },
  saferStarts: {
    title: "Safer Starts",
    body: "This focus area is staying visible in the layout, but it is not part of the live fetch yet. Once we add it, this section will outline the safest opening plan and the early choices that reduce chaos on ball one.",
  },
};

export default function MachineMasteryScreen() {
  const router = useRouter();
  const [machineName, setMachineName] = useState("");
  const [activeArea, setActiveArea] = useState("overview");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientFetchMs, setClientFetchMs] = useState(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const activeSection = useMemo(() => {
    if (activeArea === "scoringPriorities" || activeArea === "saferStarts") {
      return UPCOMING_SECTIONS[activeArea];
    }

    if (!result) {
      return null;
    }

    return result[activeArea] ?? result.overview;
  }, [activeArea, result]);

  const instructionSections = result?.instruction_sections ?? [];
  const instructionLinks = result?.instruction_links ?? [];

  async function handleFetch(event) {
    event?.preventDefault();

    const trimmedName = machineName.trim();
    if (!trimmedName || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setInstructionsOpen(false);

    const started = performance.now();
    try {
      const response = await apiFetch(`/machine-mastery/fetch?name=${encodeURIComponent(trimmedName)}`);
      setResult(response);
      setActiveArea("overview");
      setClientFetchMs(Math.round(performance.now() - started));
    } catch (fetchError) {
      setResult(null);
      setClientFetchMs(null);
      setError(fetchError.message || "Could not fetch live machine info.");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    navigateBackWithinApp(router, "/classroom");
  }

  function jumpToInstruction(anchor) {
    setInstructionsOpen(false);
    window.requestAnimationFrame(() => {
      const scrollArea = document.getElementById("instruction-scroll-area");
      if (anchor === "top") {
        scrollArea?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const target = document.getElementById(`instruction-${anchor}`);
      if (!scrollArea || !target) {
        return;
      }

      const offset = target.offsetTop - scrollArea.offsetTop;
      scrollArea.scrollTo({ top: offset, behavior: "smooth" });
    });
  }

  return (
    <RoomShell title="Machine Mastery" onBack={handleBack} navItems={NAV_ITEMS} onNavigate={(href) => router.push(href)} activeNavLabel="Classroom" shellId="machine-mastery-top">
      <main className="content">
        <section className="heroCard">
          <div className="heroImageWrap">
            <Image
              src="/classroom/machine-mastery.png"
              alt="Machine Mastery"
              fill
              unoptimized
              sizes="(max-width: 430px) 80vw, 320px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="heroCopy">
            <div className="heroKicker">Classroom Module</div>
            <h2>Machine Mastery</h2>
            <p>
              Fetch live reference info for one machine at a time so you can test overview, history, and rule access before we lock in a fuller machine library.
            </p>
          </div>
        </section>

        <ClassroomCameraCard storageKey="flipperiq-classroom-camera-machine-mastery" title="Machine Mastery Photo Reference" hint="Capture the playfield, apron card, or display before you fetch machine details." />

        <section className="sectionCard machineNameCard">
          <div className="sectionKicker">Machine Setup</div>
          <label className="machineLabel" htmlFor="machine-name-input">
            Enter Pinball Name
          </label>
          <form onSubmit={handleFetch}>
            <PinballNameInput
              id="machine-name-input"
              value={machineName}
              onValueChange={setMachineName}
              placeholder="Enter machine name"
              actionLabel="Fetch live machine info"
              onAction={handleFetch}
              disabled={loading}
            />
          </form>
          <div className="fetchHint">This fetches live web info so you can see whether the lookup works and how long it takes.</div>
        </section>

        <section className="sectionCard">
          <div className="sectionKicker">Focus Areas</div>
          <div className="pillGrid">
            {FOCUS_AREAS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`focusPill ${activeArea === item.key ? "focusPillActive" : ""}`}
                onClick={() => setActiveArea(item.key)}
                disabled={!result && item.live}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="sectionCard resultSection">
          <div className="sectionKicker">Live Machine Info</div>

          {loading ? (
            <div className="statusCard">
              <div className="statusTitle">Fetching live info...</div>
              <div className="statusCopy">Checking live machine references now.</div>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="statusCard statusCardError">
              <div className="statusTitle">Fetch failed</div>
              <div className="statusCopy">{error}</div>
            </div>
          ) : null}

          {!loading && !error && !result && !activeSection ? (
            <div className="statusCard">
              <div className="statusTitle">Nothing fetched yet</div>
              <div className="statusCopy">Enter a machine name and press the arrow to test the live fetch.</div>
            </div>
          ) : null}

          {activeSection ? (
            <>
              {result ? (
                <div className="timingRow">
                  <div className="timingCard">
                    <div className="timingLabel">Resolved Title</div>
                    <div className="timingValue">{result.resolved_title}</div>
                  </div>
                  <div className="timingCard">
                    <div className="timingLabel">Backend Fetch</div>
                    <div className="timingValue">{(result.fetch_ms / 1000).toFixed(2)}s</div>
                  </div>
                  <div className="timingCard">
                    <div className="timingLabel">Page Request</div>
                    <div className="timingValue">{clientFetchMs ? `${(clientFetchMs / 1000).toFixed(2)}s` : "--"}</div>
                  </div>
                </div>
              ) : null}

              {activeArea === "instructions" && result ? (
                <>
                  <div className="instructionsLauncherBar">
                    <button type="button" className="instructionsLauncher" onClick={() => setInstructionsOpen((open) => !open)}>
                      Jump To
                    </button>
                    {instructionsOpen ? (
                      <div className="jumpMenu">
                        <div className="jumpMenuTitle">Jump To</div>
                        <button type="button" className="jumpMenuButton" onClick={() => jumpToInstruction("top")}>
                          Back to Top
                        </button>
                        {instructionLinks.map((link) => (
                          <button key={link.anchor} type="button" className="jumpMenuButton" onClick={() => jumpToInstruction(link.anchor)}>
                            <span>{link.title}</span>
                            {link.unverified ? <span className="unverifiedTag">unverified</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="instructionScrollArea" id="instruction-scroll-area">
                    <div className="instructionStack">
                      {instructionSections.map((section) => (
                        <div key={section.anchor} id={`instruction-${section.anchor}`} className="instructionCard">
                          <div className="instructionTitleRow">
                            <div className="instructionTitle">{section.title}</div>
                            {section.unverified ? <div className="unverifiedTag">unverified</div> : null}
                          </div>
                          <div className="instructionBody">{section.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="contentCard">
                  <div className="contentTitle">{activeSection.title}</div>
                  <div className="contentBody">{activeSection.body}</div>
                </div>
              )}

              {result ? (
                <div className="sourcesCard">
                  <div className="sourcesTitle">Sources</div>
                  <div className="sourceList">
                    {result.sources.map((source) => (
                      <a key={source.url} href={source.url} className="sourceLink" target="_blank" rel="noreferrer">
                        {source.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
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

        .fetchHint {
          color: #a9bddf;
          font-size: 12px;
          line-height: 1.4;
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

        .focusPillActive {
          background: #4ca3ff;
          border-color: #4ca3ff;
          color: #ffffff;
        }

        .focusPill:disabled {
          opacity: 0.5;
        }

        .resultSection {
          display: grid;
          gap: 12px;
        }

        .statusCard,
        .contentCard,
        .sourcesCard,
        .instructionCard {
          padding: 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(165, 190, 232, 0.16);
        }

        .statusCardError {
          border-color: rgba(255, 120, 120, 0.32);
          background: rgba(92, 28, 40, 0.35);
        }

        .statusTitle,
        .contentTitle,
        .sourcesTitle,
        .instructionTitle {
          font-size: 13px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .statusCopy,
        .contentBody,
        .instructionBody {
          margin-top: 4px;
          color: #c5d5ee;
          font-size: 13px;
          line-height: 1.52;
          white-space: pre-wrap;
        }

        .timingRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .timingCard {
          padding: 10px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(165, 190, 232, 0.16);
        }

        .timingLabel {
          color: #9dc4ff;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .timingValue {
          margin-top: 6px;
          color: #f3f7ff;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.25;
        }

        .instructionsLauncherBar {
          position: sticky;
          top: 0;
          z-index: 2;
          padding-top: 2px;
          background: linear-gradient(180deg, rgba(12, 24, 46, 0.98), rgba(12, 24, 46, 0.7));
        }

        .instructionsLauncher {
          width: 100%;
          min-height: 44px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
        }

        .jumpMenu {
          display: grid;
          gap: 6px;
          margin-top: 8px;
          padding: 10px;
          max-height: 220px;
          overflow-y: auto;
          border-radius: 14px;
          background: rgba(10, 21, 41, 0.96);
          border: 1px solid rgba(165, 190, 232, 0.18);
          scrollbar-width: thin;
        }

        .jumpMenuTitle {
          color: #f7f4e6;
          font-size: 13px;
          font-weight: 800;
        }

        .jumpMenuButton {
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .instructionTitleRow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .unverifiedTag {
          color: #c5d5ee;
          font-size: 11px;
          font-style: italic;
          font-weight: 600;
          flex: 0 0 auto;
        }

        .instructionScrollArea {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 2px;
          scrollbar-width: thin;
        }

        .instructionStack {
          display: grid;
          gap: 10px;
        }

        .sourceList {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .sourceLink {
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(16, 31, 58, 0.72);
          border: 1px solid rgba(165, 190, 232, 0.18);
          color: #dce7ff;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }
      `}</style>
    </RoomShell>
  );
}


