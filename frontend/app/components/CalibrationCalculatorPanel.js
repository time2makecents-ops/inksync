"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildTrackedCardTransformFromSnapshot,
  getStoredCalibrationCalculator,
  getStoredCalibrationSnapshot,
  getStoredOverlayCalibration,
  setStoredCalibrationCalculator,
  setStoredOverlayCalibration,
  subscribeToStoredJson,
  CALIBRATION_SNAPSHOT_STORAGE_KEY,
  OVERLAY_CALIBRATION_STORAGE_KEY,
} from "../../lib/userPreferences";

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value, suffix = "") {
  return `${round(value)}${suffix}`;
}

function readOverlayMetrics() {
  const calibration = getStoredCalibrationSnapshot();
  const overlay = getStoredOverlayCalibration();
  const activeFrame = overlay?.activeFrame ?? "";
  const activeOverlay = activeFrame ? overlay?.frames?.[activeFrame] ?? overlay?.frameOverlay : overlay?.frameOverlay;
  const trackedCard = buildTrackedCardTransformFromSnapshot(
    calibration,
    overlay
      ? {
          width: overlay.sourceWidth,
          height: overlay.sourceHeight,
        }
      : null
  );

  return {
    overlay,
    activeFrame,
    activeOverlay,
    trackedCard,
  };
}

function buildCalculatorState() {
  const stored = getStoredCalibrationCalculator();
  const { activeOverlay, trackedCard } = readOverlayMetrics();

  return {
    cardWidth: stored?.cardWidth || trackedCard?.width || 0,
    cardHeight: stored?.cardHeight || trackedCard?.height || 0,
    overlayWidth: stored?.overlayWidth || activeOverlay?.width || 0,
    overlayHeight: stored?.overlayHeight || activeOverlay?.height || 0,
    cardRotation: stored?.cardRotation || trackedCard?.rotation || 0,
    overlayRotation: stored?.overlayRotation || activeOverlay?.rotation || 0,
  };
}

function parseInput(value) {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : 0;
}

export default function CalibrationCalculatorPanel() {
  const [form, setForm] = useState(() => buildCalculatorState());

  useEffect(() => {
    setStoredCalibrationCalculator(form);
  }, [form]);

  useEffect(() => {
    const syncFromStorage = () => {
      setForm((current) => {
        const next = buildCalculatorState();
        return JSON.stringify(current) === JSON.stringify(next) ? current : next;
      });
    };

    const unsubscribeCalibration = subscribeToStoredJson(
      CALIBRATION_SNAPSHOT_STORAGE_KEY,
      syncFromStorage
    );
    const unsubscribeOverlay = subscribeToStoredJson(
      OVERLAY_CALIBRATION_STORAGE_KEY,
      syncFromStorage
    );

    return () => {
      unsubscribeCalibration();
      unsubscribeOverlay();
    };
  }, []);

  const derived = useMemo(() => {
    const cardArea = form.cardWidth * form.cardHeight;
    const overlayArea = form.overlayWidth * form.overlayHeight;
    const widthScale = form.cardWidth > 0 ? form.overlayWidth / form.cardWidth : 0;
    const heightScale = form.cardHeight > 0 ? form.overlayHeight / form.cardHeight : 0;
    const averageScale = widthScale > 0 && heightScale > 0 ? (widthScale + heightScale) / 2 : 0;
    const cardAspect = form.cardHeight > 0 ? form.cardWidth / form.cardHeight : 0;
    const overlayAspect = form.overlayHeight > 0 ? form.overlayWidth / form.overlayHeight : 0;
    const aspectDelta = overlayAspect - cardAspect;
    const rotationDelta = form.overlayRotation - form.cardRotation;
    const widthCoverage = widthScale * 100;
    const heightCoverage = heightScale * 100;
    const areaCoverage = cardArea > 0 ? (overlayArea / cardArea) * 100 : 0;
    const suggestedWidth = form.cardWidth * averageScale;
    const suggestedHeight = form.cardHeight * averageScale;

    return {
      widthScale,
      heightScale,
      averageScale,
      cardAspect,
      overlayAspect,
      aspectDelta,
      rotationDelta,
      widthCoverage,
      heightCoverage,
      areaCoverage,
      suggestedWidth,
      suggestedHeight,
      tiltHint:
        Math.abs(aspectDelta) > 0.08
          ? "Aspect drift is high. Flatten the card or correct width and height separately."
          : Math.abs(rotationDelta) > 6
            ? "Rotation drift is dominant. Correct angle before changing scale."
            : "Scale and aspect are close enough to fine-tune from the live frame.",
    };
  }, [form]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: parseInput(value),
    }));
  }

  function pullFromLive() {
    setForm(buildCalculatorState());
  }

  function applyToOverlay() {
    const { overlay, activeFrame, activeOverlay } = readOverlayMetrics();
    if (!overlay || !activeFrame || !activeOverlay) {
      return;
    }

    const centerX = activeOverlay.x + activeOverlay.width / 2;
    const centerY = activeOverlay.y + activeOverlay.height / 2;
    const nextWidth = form.overlayWidth > 0 ? round(form.overlayWidth, 3) : activeOverlay.width;
    const nextHeight = form.overlayHeight > 0 ? round(form.overlayHeight, 3) : activeOverlay.height;
    const nextOverlay = {
      ...activeOverlay,
      width: nextWidth,
      height: nextHeight,
      x: round(centerX - nextWidth / 2, 3),
      y: round(centerY - nextHeight / 2, 3),
      rotation: round(form.overlayRotation, 3),
    };
    const nextFrames = {
      ...(overlay.frames ?? {}),
      [activeFrame]: nextOverlay,
    };

    setStoredOverlayCalibration({
      ...overlay,
      activeFrame,
      frameOverlay: nextOverlay,
      frames: nextFrames,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="calculatorCard">
      <div className="panelTop">
        <div>
          <div className="eyebrow">Task 008</div>
          <h2>Calibration calculator</h2>
        </div>
        <button type="button" className="ghostButton" onClick={pullFromLive}>
          Pull Live Values
        </button>
      </div>

      <div className="formGrid">
        <label className="field">
          <span>Card width</span>
          <input type="number" step="0.01" value={form.cardWidth} onChange={(event) => updateField("cardWidth", event.target.value)} />
        </label>
        <label className="field">
          <span>Card height</span>
          <input type="number" step="0.01" value={form.cardHeight} onChange={(event) => updateField("cardHeight", event.target.value)} />
        </label>
        <label className="field">
          <span>Overlay width</span>
          <input type="number" step="0.01" value={form.overlayWidth} onChange={(event) => updateField("overlayWidth", event.target.value)} />
        </label>
        <label className="field">
          <span>Overlay height</span>
          <input type="number" step="0.01" value={form.overlayHeight} onChange={(event) => updateField("overlayHeight", event.target.value)} />
        </label>
        <label className="field">
          <span>Card rotation</span>
          <input type="number" step="0.01" value={form.cardRotation} onChange={(event) => updateField("cardRotation", event.target.value)} />
        </label>
        <label className="field">
          <span>Overlay rotation</span>
          <input type="number" step="0.01" value={form.overlayRotation} onChange={(event) => updateField("overlayRotation", event.target.value)} />
        </label>
      </div>

      <div className="metricsGrid">
        <div className="metric">
          <span>Width scale</span>
          <strong>{formatNumber(derived.widthScale, "x")}</strong>
        </div>
        <div className="metric">
          <span>Height scale</span>
          <strong>{formatNumber(derived.heightScale, "x")}</strong>
        </div>
        <div className="metric">
          <span>Area coverage</span>
          <strong>{formatNumber(derived.areaCoverage, "%")}</strong>
        </div>
        <div className="metric">
          <span>Rotation delta</span>
          <strong>{formatNumber(derived.rotationDelta, " deg")}</strong>
        </div>
      </div>

      <div className="summary">
        <div><strong>Width coverage:</strong> {formatNumber(derived.widthCoverage, "%")}</div>
        <div><strong>Height coverage:</strong> {formatNumber(derived.heightCoverage, "%")}</div>
        <div><strong>Aspect delta:</strong> {formatNumber(derived.aspectDelta)}</div>
        <div><strong>Suggested locked size:</strong> {formatNumber(derived.suggestedWidth)} x {formatNumber(derived.suggestedHeight)}</div>
      </div>

      <div className="note">{derived.tiltHint}</div>

      <button type="button" className="primaryButton" onClick={applyToOverlay}>
        Apply To Active Overlay Frame
      </button>

      <style jsx>{`
        .calculatorCard {
          display: grid;
          gap: 14px;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.22);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .panelTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #5b6b83;
          margin-bottom: 6px;
        }

        h2 {
          margin: 0;
          font-size: 21px;
          color: #10233b;
        }

        .ghostButton,
        .primaryButton {
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          padding: 0 16px;
          font-weight: 800;
        }

        .ghostButton {
          background: rgba(16, 35, 59, 0.09);
          color: #10233b;
        }

        .primaryButton {
          background: #10233b;
          color: #fff;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .field {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #475467;
        }

        .field input {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid #cdd5df;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 700;
          color: #10233b;
          background: #fff;
        }

        .metricsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .metric,
        .summary,
        .note {
          border-radius: 16px;
        }

        .metric {
          padding: 12px 14px;
          background: #eff4fa;
          display: grid;
          gap: 4px;
        }

        .metric span {
          font-size: 12px;
          font-weight: 700;
          color: #5b6b83;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .metric strong {
          font-size: 19px;
          color: #10233b;
        }

        .summary {
          padding: 14px;
          background: #f7f9fc;
          color: #334155;
          display: grid;
          gap: 6px;
          font-size: 14px;
        }

        .note {
          padding: 12px 14px;
          background: #eef4ff;
          color: #1d4ed8;
          font-size: 14px;
          line-height: 1.45;
        }

        @media (max-width: 980px) {
          .formGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .metricsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .panelTop {
            flex-direction: column;
          }

          .formGrid,
          .metricsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
