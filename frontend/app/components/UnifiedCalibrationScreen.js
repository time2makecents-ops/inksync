"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import CalibrationCalculatorPanel from "./CalibrationCalculatorPanel";
import CalibrationScreen from "./CalibrationScreen";
import OverlayCalibrationScreen from "./OverlayCalibrationScreen";
import SignatureRevealCalibrationScreen from "./SignatureRevealCalibrationScreen";
import { exportInkSyncWorkspace, importInkSyncWorkspace } from "../../lib/userPreferences";

const VIEWS = [
  {
    id: "overlay",
    label: "1. Overlay Align",
    title: "Calibrate the fake video overlay first",
    detail: "Use the sampled reference frames, keyframes, and calculator tools to set the initial overlay alignment for the fake video workflow.",
  },
  {
    id: "reveal",
    label: "2. Signature Reveal",
    title: "Tune the reveal layer for the fake video pass",
    detail: "Refine the reveal signature against the saved guide and sampled frames after the overlay is aligned.",
  },
  {
    id: "camera",
    label: "3. Camera Track",
    title: "Optional live tracking for real-card alignment",
    detail: "Use the rear camera only when you want a live tracked card reference to help later overlay adjustments.",
  },
];

export default function UnifiedCalibrationScreen() {
  const router = useRouter();
  const importInputRef = useRef(null);
  const [activeView, setActiveView] = useState("overlay");
  const [workspaceStatus, setWorkspaceStatus] = useState("Export the current calibration workspace or import a saved bundle.");
  const currentView = VIEWS.find((view) => view.id === activeView) ?? VIEWS[0];

  function exportWorkspace() {
    const bundle = exportInkSyncWorkspace();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `inksync-workspace-${stamp}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setWorkspaceStatus("Workspace bundle exported.");
  }

  async function importWorkspace(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const ok = importInkSyncWorkspace(parsed);
      setWorkspaceStatus(ok ? "Workspace bundle imported." : "Workspace bundle was invalid.");
    } catch {
      setWorkspaceStatus("Workspace bundle could not be read.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="workspaceShell">
      <div className="workspacePanel">
        <header className="workspaceHero">
          <div className="heroCopy">
            <div className="eyebrow">Unified Calibration</div>
            <h1>{currentView.title}</h1>
            <p>{currentView.detail}</p>
          </div>
          <div className="heroMeta">
            <div className="workflowBadge">One route, staged workflow</div>
            <div className="heroChecklist">
              <span className={activeView === "camera" ? "heroChecklistActive" : ""}>Track</span>
              <span className={activeView === "overlay" ? "heroChecklistActive" : ""}>Align</span>
              <span className={activeView === "reveal" ? "heroChecklistActive" : ""}>Reveal</span>
            </div>
          </div>
        </header>

        <div className="workspaceGrid">
          <aside className="operatorRail">
            <nav className="workspaceTabs" aria-label="Calibration workflow">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`workspaceTab ${view.id === activeView ? "workspaceTabActive" : ""}`}
                  onClick={() => setActiveView(view.id)}
                >
                  <span className="workspaceTabStep">{view.label}</span>
                  <span className="workspaceTabTitle">{view.title}</span>
                </button>
              ))}
            </nav>

            <section className="workflowCard">
              <div className="eyebrow">Operator View</div>
              <h2>Keep the active screen focused</h2>
              <p>
                This shell keeps task switching, calculator tools, and workflow checkpoints above the fold while the
                detailed controls stay inside each calibration stage.
              </p>
              <ul className="workflowList">
                <li>Overlay: calibrate the fake video alignment first.</li>
                <li>Reveal: refine the signature layer for the saved frames.</li>
                <li>Camera: optional live tracking helper for real-card alignment.</li>
              </ul>
            </section>

            <section className="workflowCard">
              <div className="eyebrow">Workflow</div>
              <h2>Move between setup and performance</h2>
              <p>{workspaceStatus}</p>
              <div className="workflowActions">
                <button type="button" className="workflowButton workflowButtonPrimary" onClick={() => router.push("/controller")}>
                  Open Controller
                </button>
                <button type="button" className="workflowButton" onClick={exportWorkspace}>
                  Export Workspace
                </button>
                <button type="button" className="workflowButton" onClick={() => importInputRef.current?.click()}>
                  Import Workspace
                </button>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hiddenInput"
                onChange={importWorkspace}
              />
            </section>

            <CalibrationCalculatorPanel />
          </aside>

          <section className="workspaceStage">
            {activeView === "camera" ? <CalibrationScreen /> : null}
            {activeView === "overlay" ? <OverlayCalibrationScreen /> : null}
            {activeView === "reveal" ? <SignatureRevealCalibrationScreen /> : null}
          </section>
        </div>
      </div>

      <style jsx>{`
        .workspaceShell {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(190, 210, 255, 0.26), rgba(255, 255, 255, 0) 42%),
            linear-gradient(180deg, #f3f6fb 0%, #e3ebf5 100%);
          padding: 18px;
        }

        .workspacePanel {
          max-width: 1560px;
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }

        .workspaceHero {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: start;
          padding: 20px 22px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
        }

        .heroCopy {
          min-width: 0;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #5b6b83;
          margin-bottom: 6px;
        }

        h1 {
          margin: 0 0 8px;
          font-size: 30px;
          line-height: 1.05;
          color: #10233b;
        }

        p {
          margin: 0;
          max-width: 820px;
          color: #475467;
          line-height: 1.5;
        }

        .heroMeta {
          display: grid;
          gap: 10px;
          align-content: start;
        }

        .workflowBadge {
          padding: 12px 16px;
          border-radius: 999px;
          background: #10233b;
          color: #fff;
          font-weight: 700;
          white-space: nowrap;
        }

        .heroChecklist {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }

        .heroChecklist span {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(16, 35, 59, 0.09);
          color: #475467;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .heroChecklistActive {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .workspaceGrid {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .operatorRail {
          position: sticky;
          top: 18px;
          display: grid;
          gap: 14px;
        }

        .workspaceTabs {
          display: grid;
          gap: 10px;
        }

        .workspaceTab {
          min-height: 72px;
          padding: 14px 16px;
          border: 0;
          border-radius: 22px;
          background: rgba(16, 35, 59, 0.09);
          color: #10233b;
          font-weight: 800;
          text-align: left;
          display: grid;
          gap: 4px;
        }

        .workspaceTabActive {
          background: #10233b;
          color: #fff;
        }

        .workspaceTabStep {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .workspaceTabTitle {
          font-size: 14px;
          line-height: 1.35;
        }

        .workflowCard {
          display: grid;
          gap: 10px;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        h2 {
          margin: 0;
          font-size: 21px;
          color: #10233b;
        }

        .workflowCard p {
          font-size: 14px;
        }

        .workflowList {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 8px;
          color: #475467;
          font-size: 14px;
          line-height: 1.45;
        }

        .workflowActions {
          display: grid;
          gap: 10px;
        }

        .workflowButton {
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          padding: 0 16px;
          background: rgba(16, 35, 59, 0.09);
          color: #10233b;
          font-weight: 800;
        }

        .workflowButtonPrimary {
          background: #10233b;
          color: #fff;
        }

        .hiddenInput {
          display: none;
        }

        .workspaceStage {
          border-radius: 28px;
          min-width: 0;
        }

        @media (max-width: 1180px) {
          .workspaceGrid {
            grid-template-columns: 1fr;
          }

          .operatorRail {
            position: static;
          }
        }

        @media (max-width: 800px) {
          .workspaceShell {
            padding: 14px;
          }

          .workspaceHero {
            flex-direction: column;
          }

          h1 {
            font-size: 25px;
          }

          .workflowBadge {
            white-space: normal;
          }

          .heroChecklist {
            justify-content: start;
          }
        }
      `}</style>
    </div>
  );
}
