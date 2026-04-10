"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CALIBRATION_SNAPSHOT_STORAGE_KEY,
  OVERLAY_CALIBRATION_STORAGE_KEY,
  SIGNATURE_REVEAL_CALIBRATION_STORAGE_KEY,
  getStoredCalibrationSnapshot,
  getStoredOverlayCalibration,
  getStoredSignatureRevealCalibration,
  subscribeToStoredJson,
} from "../../lib/userPreferences";

const DEFAULT_SECRET_CODE = "6669";

const PIPELINE_STATES = [
  "locked",
  "idle",
  "precheck",
  "armed",
  "triggered",
  "countdown",
  "capturing",
  "processing",
  "ready",
  "revealing",
  "complete",
  "error",
];

function CalculatorButton({ label, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className={`calcButton ${className}`}
    >
      {label}
      <style jsx>{`
        .calcButton {
          min-height: 68px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: linear-gradient(180deg, #15171d 0%, #0d0f14 100%);
          color: #f5f7fb;
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 120ms ease, opacity 120ms ease, border-color 120ms ease;
        }

        .calcButton:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .calcButton:active {
          transform: translateY(0);
        }
      `}</style>
    </button>
  );
}

function StatusChip({ label, value, tone = "neutral" }) {
  return (
    <div className={`chip chip-${tone}`}>
      <span className="chipLabel">{label}</span>
      <span className="chipValue">{value}</span>

      <style jsx>{`
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: #dce4f3;
          font-size: 12px;
          font-weight: 700;
        }

        .chip-success {
          color: #baf1ca;
          border-color: rgba(42, 181, 84, 0.28);
          background: rgba(42, 181, 84, 0.1);
        }

        .chip-danger {
          color: #ffcccc;
          border-color: rgba(214, 65, 65, 0.28);
          background: rgba(214, 65, 65, 0.1);
        }

        .chip-warn {
          color: #ffe2a8;
          border-color: rgba(214, 156, 30, 0.28);
          background: rgba(214, 156, 30, 0.1);
        }

        .chipLabel {
          opacity: 0.72;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .chipValue {
          color: inherit;
        }
      `}</style>
    </div>
  );
}

function CalculatorLockScreen({ displayValue, onDigit, onClear, onBackspace }) {
  const rows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["C", "0", "DEL"],
  ];

  return (
    <div className="lockRoot">
      <div className="phoneShell">
        <div className="calculator">
          <div className="topBar">
            <div className="title">Calculator</div>
            <div className="mode">Standard</div>
          </div>

          <div className="displayWrap">
            <div className="memoryRow">MRC &nbsp; M- &nbsp; M+</div>
            <div className="display">{displayValue || "0"}</div>
          </div>

          <div className="keypad">
            {rows.flat().map((label) => {
              if (label === "C") {
                return (
                  <CalculatorButton
                    key={label}
                    label={label}
                    onClick={onClear}
                    className="special clear"
                  />
                );
              }

              if (label === "DEL") {
                return (
                  <CalculatorButton
                    key={label}
                    label={label}
                    onClick={onBackspace}
                    className="special backspace"
                  />
                );
              }

              return (
                <CalculatorButton
                  key={label}
                  label={label}
                  onClick={onDigit}
                />
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .lockRoot {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(53, 64, 89, 0.32), rgba(10, 12, 17, 0) 30%),
            linear-gradient(180deg, #0b0d12 0%, #05070b 100%);
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .phoneShell {
          width: 390px;
          max-width: 100%;
          min-height: 812px;
          border-radius: 34px;
          border: 8px solid #05070d;
          background: linear-gradient(180deg, #0b0d12 0%, #090b0f 100%);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 18px;
        }

        .calculator {
          width: 100%;
          border-radius: 28px;
          padding: 18px;
          background: linear-gradient(180deg, #1b1f27 0%, #12151b 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          color: #9ca6b7;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .displayWrap {
          border-radius: 22px;
          padding: 18px 16px 20px;
          background: linear-gradient(180deg, #10141a 0%, #0a0d12 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 16px;
        }

        .memoryRow {
          color: #687385;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .display {
          min-height: 54px;
          text-align: right;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 42px;
          line-height: 1.2;
          color: #b9ffd1;
          text-shadow: 0 0 12px rgba(94, 255, 156, 0.08);
          word-break: break-all;
        }

        .keypad {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        :global(.clear) {
          color: #ffd7d7;
          background: linear-gradient(180deg, #311518 0%, #200d0f 100%);
        }

        :global(.backspace) {
          color: #ffe5ad;
          background: linear-gradient(180deg, #332812 0%, #20190c 100%);
        }

        @media (max-width: 520px) {
          .lockRoot {
            padding: 0;
            background: linear-gradient(180deg, #0b0d12 0%, #05070b 100%);
          }

          .phoneShell {
            width: 100vw;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            padding: 18px 14px;
          }
        }
      `}</style>
    </div>
  );
}

function DebugPanel({
  debugVisible,
  setDebugVisible,
  accelMagnitude,
  bumpThreshold,
  setBumpThreshold,
  lastTriggerAt,
  captureCount,
  selectedFrameIndex,
  setSelectedFrameIndex,
  selectedOverlayFrameId,
  selectedRevealFrameId,
  extractionConfidence,
  notes,
  setNotes,
  pipelineState,
  precheckResult,
}) {
  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Debug / Fine Tune</div>
          <h3>Diagnostics</h3>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={debugVisible}
            onChange={(e) => setDebugVisible(e.target.checked)}
          />
          <span>Visible</span>
        </label>
      </div>

      {debugVisible ? (
        <div className="debugGrid">
          <div className="panel">
            <div className="panelTitle">Trigger Diagnostics</div>
            <div className="metric">Accelerometer magnitude: {accelMagnitude.toFixed(2)}</div>
            <div className="metric">Last trigger: {lastTriggerAt || "none"}</div>

            <label className="field">
              <span>Bump threshold</span>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={bumpThreshold}
                onChange={(e) => setBumpThreshold(Number(e.target.value))}
              />
              <small>{bumpThreshold.toFixed(1)}</small>
            </label>
          </div>

          <div className="panel">
            <div className="panelTitle">Processing Diagnostics</div>
            <div className="metric">Pipeline state: {pipelineState}</div>
            <div className="metric">Lighting result: {precheckResult}</div>
            <div className="metric">
              Extraction confidence: {(extractionConfidence * 100).toFixed(0)}%
            </div>
            <div className="metric">Captured frames: {captureCount}</div>
            <div className="metric">Overlay frame: {selectedOverlayFrameId}</div>
            <div className="metric">Reveal frame: {selectedRevealFrameId}</div>

            <label className="field">
              <span>Selected frame index</span>
              <input
                type="number"
                min="0"
                value={selectedFrameIndex}
                onChange={(e) => setSelectedFrameIndex(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <div className="panel panelWide">
            <div className="panelTitle">Operator Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lighting notes, framing notes, extraction notes..."
            />
          </div>
        </div>
      ) : (
        <div className="muted">Debug controls hidden.</div>
      )}

      <style jsx>{`
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(21, 25, 33, 0.94), rgba(11, 14, 19, 0.98));
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .cardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .eyebrow {
          color: #89a4d1;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h3 {
          margin: 6px 0 0;
          font-size: 20px;
          color: #f3f6fc;
        }

        .toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #cfd8ea;
          font-size: 13px;
          font-weight: 700;
        }

        .debugGrid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .panel {
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 14px;
        }

        .panelWide {
          grid-column: 1 / -1;
        }

        .panelTitle {
          color: #f3f6fc;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .metric {
          color: #c7d2e7;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .field {
          display: grid;
          gap: 8px;
          margin-top: 10px;
          color: #c7d2e7;
          font-size: 13px;
        }

        input[type="number"],
        textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #0c1016;
          color: #f3f6fc;
          padding: 10px 12px;
          font: inherit;
          outline: none;
        }

        textarea {
          min-height: 120px;
          resize: vertical;
        }

        .muted {
          color: #9da8bc;
          font-size: 13px;
        }

        @media (max-width: 820px) {
          .debugGrid {
            grid-template-columns: 1fr;
          }

          .panelWide {
            grid-column: auto;
          }
        }
      `}</style>
    </section>
  );
}

function PerformanceHUD({ pipelineState, precheckResult, countdownRemaining, isArmed }) {
  const precheckTone =
    precheckResult === "YES"
      ? "success"
      : precheckResult === "NO"
      ? "danger"
      : "warn";

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Performance</div>
          <h3>Magician Control Surface</h3>
        </div>
      </div>

      <div className="chips">
        <StatusChip label="State" value={pipelineState} />
        <StatusChip label="Lighting" value={precheckResult} tone={precheckTone} />
        <StatusChip label="Armed" value={isArmed ? "YES" : "NO"} />
        <StatusChip label="Countdown" value={`${countdownRemaining}s`} />
      </div>

      <style jsx>{`
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(21, 25, 33, 0.94), rgba(11, 14, 19, 0.98));
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .cardHeader {
          margin-bottom: 14px;
        }

        .eyebrow {
          color: #89a4d1;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h3 {
          margin: 6px 0 0;
          font-size: 20px;
          color: #f3f6fc;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
      `}</style>
    </section>
  );
}

function WorkflowStatus({ calibrationSnapshot, overlayCalibration, revealCalibration, onOpenCalibration }) {
  const calibrationReady = Boolean(calibrationSnapshot?.savedAt);
  const overlayReady = Boolean(overlayCalibration?.activeFrame && Object.keys(overlayCalibration?.frames ?? {}).length);
  const revealReady = Boolean(revealCalibration?.activeFrame && Object.keys(revealCalibration?.frames ?? {}).length);

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Workflow</div>
          <h3>Calibration readiness</h3>
        </div>
      </div>

      <div className="chips">
        <StatusChip label="Track" value={calibrationReady ? "READY" : "MISSING"} tone={calibrationReady ? "success" : "warn"} />
        <StatusChip label="Overlay" value={overlayReady ? "READY" : "MISSING"} tone={overlayReady ? "success" : "warn"} />
        <StatusChip label="Reveal" value={revealReady ? "READY" : "MISSING"} tone={revealReady ? "success" : "warn"} />
      </div>

        <div className="readinessCopy">
          {calibrationReady
            ? `Tracking snapshot saved ${new Date(calibrationSnapshot.savedAt).toLocaleString()}.`
            : "Open calibration and save a tracking snapshot before performance."}
        </div>
        <div className="readinessCopy">
          {overlayReady && revealReady
            ? "Overlay and reveal calibrations are present."
            : "Overlay and reveal calibration passes still need to be verified before performance."}
        </div>

        <button type="button" className="navButton" onClick={onOpenCalibration}>
          Open Calibration Workspace
      </button>

      <style jsx>{`
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(21, 25, 33, 0.94), rgba(11, 14, 19, 0.98));
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .cardHeader {
          margin-bottom: 14px;
        }

        .eyebrow {
          color: #89a4d1;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h3 {
          margin: 6px 0 0;
          font-size: 20px;
          color: #f3f6fc;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .readinessCopy {
          color: #c7d2e7;
          font-size: 13px;
          line-height: 1.45;
          margin-bottom: 12px;
        }

        .navButton {
          width: 100%;
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          background: #f3f6fc;
          color: #0f172a;
          font-weight: 800;
        }
      `}</style>
    </section>
  );
}

function WorkspacePreview({ title, subtitle, imageSrc, fallback }) {
  return (
    <div className="previewCard">
      <div className="previewMeta">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {imageSrc ? (
        <img src={imageSrc} alt={title} className="previewImage" />
      ) : (
        <div className="previewFallback">{fallback}</div>
      )}

      <style jsx>{`
        .previewCard {
          border-radius: 14px;
          border: 1px dashed rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.02);
          overflow: hidden;
          min-height: 132px;
        }

        .previewMeta {
          display: grid;
          gap: 4px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .previewMeta strong {
          color: #f3f6fc;
          font-size: 13px;
        }

        .previewMeta span {
          color: #9fb0cb;
          font-size: 12px;
        }

        .previewImage {
          display: block;
          width: 100%;
          min-height: 92px;
          max-height: 180px;
          object-fit: cover;
          background: #0c1016;
        }

        .previewFallback {
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 12px;
          color: #8f9bb0;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function RunChecklist({ calibrationReady, overlayReady, revealReady, precheckResult, isArmed, pipelineState }) {
  const items = [
    {
      label: "Tracking snapshot saved",
      done: calibrationReady,
    },
    {
      label: "Overlay alignment saved",
      done: overlayReady,
    },
    {
      label: "Reveal alignment saved",
      done: revealReady,
    },
    {
      label: "Lighting precheck passed",
      done: precheckResult === "YES",
    },
    {
      label: "Run is armed",
      done: isArmed,
    },
    {
      label: "Controller reached ready state",
      done: pipelineState === "ready" || pipelineState === "revealing" || pipelineState === "complete",
    },
  ];

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Run Checklist</div>
          <h3>Operator gate</h3>
        </div>
      </div>

      <div className="checklist">
        {items.map((item) => (
          <div key={item.label} className={`checkItem ${item.done ? "checkItemDone" : ""}`}>
            <span className="checkDot" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(21, 25, 33, 0.94), rgba(11, 14, 19, 0.98));
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .cardHeader {
          margin-bottom: 14px;
        }

        .eyebrow {
          color: #89a4d1;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h3 {
          margin: 6px 0 0;
          font-size: 20px;
          color: #f3f6fc;
        }

        .checklist {
          display: grid;
          gap: 10px;
        }

        .checkItem {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          color: #c7d2e7;
          font-size: 13px;
        }

        .checkItemDone {
          color: #baf1ca;
          background: rgba(42, 181, 84, 0.08);
        }

        .checkDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: currentColor;
          flex: none;
        }
      `}</style>
    </section>
  );
}

export default function InkSyncController() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [debugVisible, setDebugVisible] = useState(true);

  const [pipelineState, setPipelineState] = useState("locked");
  const [precheckResult, setPrecheckResult] = useState("UNKNOWN");
  const [isArmed, setIsArmed] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(5);

  const [accelMagnitude, setAccelMagnitude] = useState(0);
  const [bumpThreshold, setBumpThreshold] = useState(1.8);
  const [lastTriggerAt, setLastTriggerAt] = useState("");
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [calibrationSnapshot, setCalibrationSnapshot] = useState(null);
  const [overlayCalibration, setOverlayCalibration] = useState(null);
  const [revealCalibration, setRevealCalibration] = useState(null);
  const calibrationReady = Boolean(calibrationSnapshot?.savedAt);
  const overlayReady = Boolean(overlayCalibration?.activeFrame && Object.keys(overlayCalibration?.frames ?? {}).length);
  const revealReady = Boolean(revealCalibration?.activeFrame && Object.keys(revealCalibration?.frames ?? {}).length);
  const overlayFrameIds = useMemo(() => Object.keys(overlayCalibration?.frames ?? {}), [overlayCalibration]);
  const revealFrameIds = useMemo(() => Object.keys(revealCalibration?.frames ?? {}), [revealCalibration]);
  const captureCount = overlayFrameIds.length;
  const extractionConfidence = useMemo(
    () => ((calibrationSnapshot?.captureReview?.score ?? 0) / 100),
    [calibrationSnapshot]
  );
  const selectedOverlayFrameId = overlayFrameIds[selectedFrameIndex] ?? overlayCalibration?.activeFrame ?? "none";
  const selectedRevealFrameId = revealFrameIds[selectedFrameIndex] ?? revealCalibration?.activeFrame ?? "none";

  useEffect(() => {
    setPipelineState(isUnlocked ? "idle" : "locked");
  }, [isUnlocked]);

  useEffect(() => {
    setCalibrationSnapshot(getStoredCalibrationSnapshot());
    setOverlayCalibration(getStoredOverlayCalibration());
    setRevealCalibration(getStoredSignatureRevealCalibration());

    const unsubscribeCalibration = subscribeToStoredJson(CALIBRATION_SNAPSHOT_STORAGE_KEY, setCalibrationSnapshot);
    const unsubscribeOverlay = subscribeToStoredJson(OVERLAY_CALIBRATION_STORAGE_KEY, setOverlayCalibration);
    const unsubscribeReveal = subscribeToStoredJson(SIGNATURE_REVEAL_CALIBRATION_STORAGE_KEY, setRevealCalibration);

    return () => {
      unsubscribeCalibration();
      unsubscribeOverlay();
      unsubscribeReveal();
    };
  }, []);

  useEffect(() => {
    if (enteredCode === DEFAULT_SECRET_CODE) {
      setIsUnlocked(true);
      setEnteredCode("");
    }
  }, [enteredCode]);

  useEffect(() => {
    if (!isUnlocked) return;

    const timer = window.setInterval(() => {
      setAccelMagnitude(1.1 + Math.random() * 1.1);
    }, 700);

    return () => window.clearInterval(timer);
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked || pipelineState !== "countdown") return;
    if (countdownRemaining <= 0) {
      setPipelineState("capturing");
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdownRemaining((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isUnlocked, pipelineState, countdownRemaining]);

  useEffect(() => {
    if (selectedFrameIndex < captureCount) {
      return;
    }

    setSelectedFrameIndex(Math.max(0, captureCount - 1));
  }, [captureCount, selectedFrameIndex]);

  useEffect(() => {
    if (pipelineState !== "capturing") return;

    const timer = window.setTimeout(() => {
      setPipelineState("processing");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pipelineState]);

  useEffect(() => {
    if (pipelineState !== "processing") return;

    const timer = window.setTimeout(() => {
      setPipelineState("ready");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [pipelineState]);

  const availableStates = useMemo(() => PIPELINE_STATES.join(" -> "), []);

  function appendDigit(digit) {
    if (isUnlocked) return;
    setEnteredCode((prev) => (prev + digit).slice(0, 8));
  }

  function clearCode() {
    if (isUnlocked) return;
    setEnteredCode("");
  }

  function backspaceCode() {
    if (isUnlocked) return;
    setEnteredCode((prev) => prev.slice(0, -1));
  }

  function runLightingPrecheck() {
    if (!calibrationReady) {
      setPrecheckResult("NO");
      setPipelineState("error");
      return;
    }

    setPipelineState("precheck");

    window.setTimeout(() => {
      const passed = extractionConfidence >= 0.75 && overlayReady && revealReady;
      setPrecheckResult(passed ? "YES" : "NO");
      setPipelineState(passed ? "idle" : "error");
    }, 700);
  }

  function armSystem() {
    if (!calibrationReady || !overlayReady || !revealReady || precheckResult !== "YES") {
      setPipelineState("error");
      return;
    }

    setIsArmed(true);
    setPipelineState("armed");
  }

  function beginRunSequence() {
    if (!isArmed) return;
    setLastTriggerAt(new Date().toLocaleTimeString());
    setPipelineState("triggered");

    window.setTimeout(() => {
      setCountdownRemaining(5);
      setPipelineState("countdown");
    }, 300);
  }

  function startReveal() {
    if (pipelineState !== "ready") {
      return;
    }

    setPipelineState("revealing");

    window.setTimeout(() => {
      setPipelineState("complete");
    }, 1400);
  }

  function resetRun() {
    setPipelineState("idle");
    setPrecheckResult("UNKNOWN");
    setIsArmed(false);
    setCountdownRemaining(5);
    setSelectedFrameIndex(0);
  }

  function lockApp() {
    setIsUnlocked(false);
    setEnteredCode("");
    resetRun();
  }

  if (!isUnlocked) {
    return (
      <CalculatorLockScreen
        displayValue={enteredCode}
        onDigit={appendDigit}
        onClear={clearCode}
        onBackspace={backspaceCode}
      />
    );
  }

  return (
    <div className="screen">
      <div className="shell">
        <header className="topBar">
          <div>
            <div className="eyebrow">InkSync</div>
            <h1>Controller</h1>
          </div>

          <button type="button" className="lockButton" onClick={lockApp}>
            Lock
          </button>
        </header>

        <main className="content">
          <PerformanceHUD
            pipelineState={pipelineState}
            precheckResult={precheckResult}
            countdownRemaining={countdownRemaining}
            isArmed={isArmed}
          />

          <WorkflowStatus
            calibrationSnapshot={calibrationSnapshot}
            overlayCalibration={overlayCalibration}
            revealCalibration={revealCalibration}
            onOpenCalibration={() => router.push("/calibration")}
          />

          <RunChecklist
            calibrationReady={calibrationReady}
            overlayReady={overlayReady}
            revealReady={revealReady}
            precheckResult={precheckResult}
            isArmed={isArmed}
            pipelineState={pipelineState}
          />

          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="eyebrow">Operator Actions</div>
                <h3>Run the sequence</h3>
              </div>
            </div>

            <div className="actionGrid">
              <button type="button" className="actionButton" onClick={runLightingPrecheck}>
                <span className="actionTitle">Run Lighting Precheck</span>
                <span className="actionCopy">
                  Confirm whether signature extraction should succeed.
                </span>
              </button>

              <button type="button" className="actionButton" onClick={armSystem}>
                <span className="actionTitle">Arm Trick</span>
                <span className="actionCopy">
                  Lock the run once the controller passes the checklist.
                </span>
              </button>

              <button type="button" className="actionButton" onClick={beginRunSequence} disabled={!isArmed}>
                <span className="actionTitle">Begin Run Sequence</span>
                <span className="actionCopy">
                  Start the trigger, countdown, capture, and processing chain from the armed state.
                </span>
              </button>

              <button type="button" className="actionButton" onClick={startReveal} disabled={pipelineState !== "ready"}>
                <span className="actionTitle">Start Reveal</span>
                <span className="actionCopy">
                  Advance only after the run reaches the ready state.
                </span>
              </button>

              <button type="button" className="actionButton" onClick={resetRun}>
                <span className="actionTitle">Reset Run</span>
                <span className="actionCopy">
                  Clear state and re-stage the effect.
                </span>
              </button>

              <button type="button" className="actionButton" onClick={() => router.push("/calibration")}>
                <span className="actionTitle">Return To Calibration</span>
                <span className="actionCopy">
                  Move back into the setup workspace to adjust tracking, overlay, or reveal alignment.
                </span>
              </button>
            </div>
          </section>

          <DebugPanel
            debugVisible={debugVisible}
            setDebugVisible={setDebugVisible}
            accelMagnitude={accelMagnitude}
            bumpThreshold={bumpThreshold}
            setBumpThreshold={setBumpThreshold}
            lastTriggerAt={lastTriggerAt}
            captureCount={captureCount}
            selectedFrameIndex={selectedFrameIndex}
            setSelectedFrameIndex={setSelectedFrameIndex}
            selectedOverlayFrameId={selectedOverlayFrameId}
            selectedRevealFrameId={selectedRevealFrameId}
            extractionConfidence={extractionConfidence}
            notes={notes}
            setNotes={setNotes}
            pipelineState={pipelineState}
            precheckResult={precheckResult}
          />

          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="eyebrow">Pipeline</div>
                <h3>Current sequence map</h3>
              </div>
            </div>

            <div className="pipeline">{availableStates}</div>

            <div className="previewGrid">
              <WorkspacePreview
                title="Capture Snapshot"
                subtitle={calibrationSnapshot?.savedAt ? new Date(calibrationSnapshot.savedAt).toLocaleString() : "No saved snapshot"}
                imageSrc={calibrationSnapshot?.capturedPhoto || ""}
                fallback="No captured tracking snapshot yet."
              />
              <WorkspacePreview
                title="Overlay Alignment"
                subtitle={overlayCalibration?.activeFrame ? `Active frame ${overlayCalibration.activeFrame}` : "No overlay calibration"}
                imageSrc=""
                fallback={
                  overlayReady
                    ? `Overlay frames saved: ${Object.keys(overlayCalibration?.frames ?? {}).length}`
                    : "Overlay calibration has not been saved yet."
                }
              />
              <WorkspacePreview
                title="Reveal Alignment"
                subtitle={revealCalibration?.activeFrame ? `Active frame ${revealCalibration.activeFrame}` : "No reveal calibration"}
                imageSrc=""
                fallback={
                  revealReady
                    ? `Reveal frames saved: ${Object.keys(revealCalibration?.frames ?? {}).length}`
                    : "Signature reveal calibration has not been saved yet."
                }
              />
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            radial-gradient(circle at top, rgba(46, 71, 122, 0.26), rgba(9, 12, 18, 0) 32%),
            linear-gradient(180deg, #0c1016 0%, #06080c 100%);
          font-family: "Segoe UI", Arial, sans-serif;
          color: #f3f6fc;
        }

        .shell {
          width: 430px;
          max-width: 100%;
          min-height: 860px;
          border-radius: 34px;
          border: 8px solid #05070d;
          background: linear-gradient(180deg, #10151d 0%, #0a0d13 100%);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 26px 18px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(17, 24, 36, 0.94), rgba(12, 16, 23, 0.9));
        }

        .eyebrow {
          color: #89a4d1;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h1 {
          margin: 6px 0 0;
          font-size: 24px;
          color: #f3f6fc;
        }

        .lockButton {
          min-width: 74px;
          height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: #121822;
          color: #f3f6fc;
          font-weight: 700;
          cursor: pointer;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: grid;
          gap: 14px;
        }

        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(21, 25, 33, 0.94), rgba(11, 14, 19, 0.98));
          padding: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        }

        .cardHeader {
          margin-bottom: 14px;
        }

        h3 {
          margin: 6px 0 0;
          font-size: 20px;
          color: #f3f6fc;
        }

        .actionGrid {
          display: grid;
          gap: 10px;
        }

        .actionButton {
          width: 100%;
          text-align: left;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(27, 34, 46, 0.98), rgba(13, 17, 24, 1));
          padding: 14px;
          cursor: pointer;
          color: #f3f6fc;
        }

        .actionButton:hover {
          border-color: rgba(255, 255, 255, 0.16);
        }

        .actionTitle {
          display: block;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .actionCopy {
          display: block;
          font-size: 13px;
          color: #b9c6dc;
          line-height: 1.4;
        }

        .pipeline {
          color: #c7d2e7;
          font-size: 13px;
          line-height: 1.6;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 12px;
        }

        .previewGrid {
          display: grid;
          gap: 10px;
        }

        @media (max-width: 520px) {
          .screen {
            padding: 0;
            background: linear-gradient(180deg, #0c1016 0%, #06080c 100%);
          }

          .shell {
            width: 100vw;
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
