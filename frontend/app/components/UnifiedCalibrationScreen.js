"use client";

import { useState } from "react";

import CalibrationScreen from "./CalibrationScreen";
import OverlayCalibrationScreen from "./OverlayCalibrationScreen";
import SignatureRevealCalibrationScreen from "./SignatureRevealCalibrationScreen";

const VIEWS = [
  {
    id: "camera",
    label: "1. Camera Track",
    title: "Track the live card first",
    detail: "Lock the tracked card reference and save a calibration snapshot before moving to overlay alignment.",
  },
  {
    id: "overlay",
    label: "2. Overlay Align",
    title: "Align the overlay against sampled frames",
    detail: "Use tracked-reference guides and keyframes to shape the overlay across the reference frames.",
  },
  {
    id: "reveal",
    label: "3. Signature Reveal",
    title: "Tune the reveal signature against the tracked guide",
    detail: "Use the tracked card guide as the baseline before refining the signature reveal layer.",
  },
];

export default function UnifiedCalibrationScreen() {
  const [activeView, setActiveView] = useState("camera");
  const currentView = VIEWS.find((view) => view.id === activeView) ?? VIEWS[0];

  return (
    <div className="workspaceShell">
      <div className="workspacePanel">
        <header className="workspaceHero">
          <div>
            <div className="eyebrow">Unified Calibration</div>
            <h1>{currentView.title}</h1>
            <p>{currentView.detail}</p>
          </div>
          <div className="workflowBadge">One route, staged workflow</div>
        </header>

        <nav className="workspaceTabs" aria-label="Calibration workflow">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className={`workspaceTab ${view.id === activeView ? "workspaceTabActive" : ""}`}
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>

        <section className="workspaceStage">
          {activeView === "camera" ? <CalibrationScreen /> : null}
          {activeView === "overlay" ? <OverlayCalibrationScreen /> : null}
          {activeView === "reveal" ? <SignatureRevealCalibrationScreen /> : null}
        </section>
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
          max-width: 1420px;
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

        .workflowBadge {
          padding: 12px 16px;
          border-radius: 999px;
          background: #10233b;
          color: #fff;
          font-weight: 700;
          white-space: nowrap;
        }

        .workspaceTabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 0 4px;
        }

        .workspaceTab {
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          background: rgba(16, 35, 59, 0.09);
          color: #10233b;
          font-weight: 800;
        }

        .workspaceTabActive {
          background: #10233b;
          color: #fff;
        }

        .workspaceStage {
          border-radius: 28px;
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
        }
      `}</style>
    </div>
  );
}
