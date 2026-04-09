"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildTrackedCardTransformFromSnapshot,
  buildSignatureRevealCalibrationSnapshot,
  getStoredCalibrationSnapshot,
  getStoredSignatureRevealCalibration,
  normalizeCardTransform,
  setStoredSignatureRevealCalibration,
} from "../../lib/userPreferences";

const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1920;
const DEFAULT_FRAME_ID = "frame_07_5";
const DEFAULT_STEP_SIZE = 0.001;
const ROTATION_STEP = 0.25;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const MIN_SIZE = 24;
const REVEAL_VISIBILITY_STEP = 0.05;
const REVEAL_SPEED_STEP = 0.05;
const REVEAL_MIN_SPEED = 0.05;
const REVEAL_MAX_SPEED = 3;
const SIGNATURE_IMAGE_ROTATION = 0;
const SIGNATURE_IMAGE_SCALE = 0.9;
const SIGNATURE_IMAGE_OFFSET_X = 0;
const SIGNATURE_IMAGE_OFFSET_Y = 0;
const DEFAULT_GUIDE = {
  x: 370,
  y: 1008,
  width: 191.2780000000002,
  height: 135.515,
  rotation: -9.25,
};
const DEFAULT_SIGNATURE = {
  x: 388,
  y: 1136,
  width: 230,
  height: 94,
  rotation: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBox(box, fallback = DEFAULT_SIGNATURE) {
  const width = Number.isFinite(box?.width) ? box.width : fallback.width;
  const height = Number.isFinite(box?.height) ? box.height : fallback.height;
  return {
    x: Number.isFinite(box?.x) ? box.x : fallback.x,
    y: Number.isFinite(box?.y) ? box.y : fallback.y,
    width,
    height,
    rotation: Number.isFinite(box?.rotation) ? box.rotation : fallback.rotation,
  };
}

function frameIdToSeconds(frameId) {
  const match = /^frame_(\d+)_(\d+)$/.exec(frameId);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10) / 10;
}

function getDefaultSignatureMap(frames) {
  return Object.fromEntries(frames.map((frame) => [frame.id, { ...DEFAULT_SIGNATURE }]));
}

function buildInheritedSignatureMap(frames, rawFrames) {
  const inherited = {};
  let previous = null;

  for (const frame of frames) {
    const next = rawFrames?.[frame.id];
    if (next) {
      previous = normalizeBox(next, previous ?? DEFAULT_SIGNATURE);
      inherited[frame.id] = { ...previous };
      continue;
    }

    inherited[frame.id] = { ...(previous ?? DEFAULT_SIGNATURE) };
  }

  return inherited;
}

export default function SignatureRevealCalibrationScreen() {
  const stageRef = useRef(null);
  const dragStateRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [frameId, setFrameId] = useState(DEFAULT_FRAME_ID);
  const [sourceSize, setSourceSize] = useState({ width: SOURCE_WIDTH, height: SOURCE_HEIGHT });
  const [guideByFrame, setGuideByFrame] = useState({});
  const [signatureByFrame, setSignatureByFrame] = useState({});
  const [status, setStatus] = useState("Loading reference frames...");
  const [zoom, setZoom] = useState(1);
  const [stepSize, setStepSize] = useState(DEFAULT_STEP_SIZE);
  const [showGuide, setShowGuide] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [revealSpeed, setRevealSpeed] = useState(0.45);
  const [isRevealRunning, setIsRevealRunning] = useState(false);
  const [trackingSnapshot, setTrackingSnapshot] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const framesResponse = await fetch("/api/overlay-reference-frames", { cache: "no-store" });
        const framesPayload = await framesResponse.json();
        if (cancelled) {
          return;
        }

        const nextFrames = framesPayload.frames ?? [];
        setFrames(nextFrames);
        setSourceSize({
          width: framesPayload.sourceWidth ?? SOURCE_WIDTH,
          height: framesPayload.sourceHeight ?? SOURCE_HEIGHT,
        });

        const currentFrameId =
          nextFrames.some((frame) => frame.id === frameId) && frameId
            ? frameId
            : nextFrames[0]?.id ?? DEFAULT_FRAME_ID;
        setFrameId(currentFrameId);

        let loadedGuides = {};
        try {
          const guideResponse = await fetch("/api/overlay-calibration-backup", { cache: "no-store" });
          if (guideResponse.ok) {
            const guidePayload = await guideResponse.json();
            if (guidePayload?.frames && typeof guidePayload.frames === "object") {
              loadedGuides = Object.fromEntries(
                Object.entries(guidePayload.frames).map(([key, value]) => [key, normalizeBox(value, DEFAULT_GUIDE)])
              );
            }
          }
        } catch {
          loadedGuides = {};
        }
        setGuideByFrame((current) => ({ ...loadedGuides, ...current }));
        setTrackingSnapshot(getStoredCalibrationSnapshot());

        let loadedSignature = {};
        const storedSignature = getStoredSignatureRevealCalibration();
        if (storedSignature?.frames && typeof storedSignature.frames === "object") {
          loadedSignature = Object.fromEntries(
            Object.entries(storedSignature.frames).map(([key, value]) => [
              key,
              normalizeBox(normalizeCardTransform(value, DEFAULT_SIGNATURE), DEFAULT_SIGNATURE),
            ])
          );
        }

        try {
          const signatureResponse = await fetch("/api/signature-reveal-calibration-backup", {
            cache: "no-store",
          });
          if (signatureResponse.ok) {
            const signaturePayload = await signatureResponse.json();
            if (signaturePayload?.frames && typeof signaturePayload.frames === "object") {
              loadedSignature = Object.fromEntries(
                Object.entries(signaturePayload.frames).map(([key, value]) => [
                  key,
                  normalizeBox(value, DEFAULT_SIGNATURE),
                ])
              );
            }
          }
        } catch {
          loadedSignature = {};
        }

        setSignatureByFrame(
          Object.keys(loadedSignature).length
            ? buildInheritedSignatureMap(nextFrames, loadedSignature)
            : getDefaultSignatureMap(nextFrames)
        );

        setStatus(nextFrames.length ? "Signature reveal calibration ready." : "No sampled frames found.");
      } catch (error) {
        setStatus(`Unable to load frames: ${error.message}`);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!Object.keys(signatureByFrame).length) {
      return;
    }

    const snapshot = buildSignatureRevealCalibrationSnapshot({
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
      activeFrame: frameId,
      frameOverlay: normalizeBox(signatureByFrame[frameId] ?? DEFAULT_SIGNATURE),
      frames: signatureByFrame,
      updatedAt: new Date().toISOString(),
    }, DEFAULT_SIGNATURE);

    setStoredSignatureRevealCalibration(snapshot);

    fetch("/api/signature-reveal-calibration-backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
    }).catch(() => {});
  }, [frameId, signatureByFrame, sourceSize.height, sourceSize.width]);

  useEffect(() => {
    if (!isRevealRunning) {
      return undefined;
    }

    let rafId = null;
    let lastTimestamp = null;

    function tick(timestamp) {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      setRevealProgress((current) => Math.min(1, current + deltaSeconds * revealSpeed));
      rafId = window.requestAnimationFrame(tick);
    }

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isRevealRunning, revealSpeed]);

  const currentFrame = useMemo(
    () => frames.find((frame) => frame.id === frameId) ?? null,
    [frameId, frames]
  );

  const guide = useMemo(() => {
    return normalizeBox(guideByFrame[frameId] ?? DEFAULT_GUIDE, DEFAULT_GUIDE);
  }, [frameId, guideByFrame]);
  const trackedGuide = useMemo(() => {
    const tracked = buildTrackedCardTransformFromSnapshot(trackingSnapshot, sourceSize, guide);
    return tracked ? normalizeBox(tracked, DEFAULT_GUIDE) : null;
  }, [guide, sourceSize, trackingSnapshot]);

  const signature = normalizeBox(signatureByFrame[frameId] ?? DEFAULT_SIGNATURE);
  const signatureMask = `linear-gradient(90deg, rgba(0, 0, 0, 1) ${Math.max(
    0,
    revealProgress * 100 - 12
  )}%, rgba(0, 0, 0, 0.88) ${Math.max(0, revealProgress * 100 - 3)}%, rgba(0, 0, 0, 0) ${Math.min(
    100,
    revealProgress * 100 + 8
  )}%)`;

  function updateSignature(updater) {
    setSignatureByFrame((current) => {
      const existing = normalizeBox(current[frameId] ?? DEFAULT_SIGNATURE);
      const next = typeof updater === "function" ? updater(existing) : normalizeBox(updater);
      return {
        ...current,
        [frameId]: normalizeBox(next),
      };
    });
  }

  function updateSignatureSize(deltaWidth, deltaHeight) {
    updateSignature((current) => {
      const nextWidth = clamp(current.width + deltaWidth * stepSize, MIN_SIZE, sourceSize.width);
      const nextHeight = clamp(current.height + deltaHeight * stepSize, MIN_SIZE, sourceSize.height);
      const centerX = current.x + current.width / 2;
      const centerY = current.y + current.height / 2;
      return {
        ...current,
        width: nextWidth,
        height: nextHeight,
        x: clamp(centerX - nextWidth / 2, 0, sourceSize.width - nextWidth),
        y: clamp(centerY - nextHeight / 2, 0, sourceSize.height - nextHeight),
      };
    });
  }

  function nudgeSignature(dx, dy) {
    updateSignature((current) => ({
      ...current,
      x: clamp(current.x + dx * stepSize, 0, sourceSize.width - current.width),
      y: clamp(current.y + dy * stepSize, 0, sourceSize.height - current.height),
    }));
  }

  function rotateSignature(delta) {
    updateSignature((current) => ({
      ...current,
      rotation: Math.round((current.rotation + delta) * 100) / 100,
    }));
  }

  function resetCurrentFrame() {
    updateSignature({ ...DEFAULT_SIGNATURE });
  }

  function copyCurrentToAllFrames() {
    setSignatureByFrame((current) => {
      const next = { ...current };
      const source = normalizeBox(current[frameId] ?? DEFAULT_SIGNATURE);
      for (const frame of frames) {
        next[frame.id] = { ...source };
      }
      return next;
    });
  }

  function applyTrackedGuide() {
    if (!trackedGuide) {
      return;
    }

    setGuideByFrame((current) => ({
      ...current,
      [frameId]: trackedGuide,
    }));
    setShowGuide(true);
    setStatus("Applied the tracked card reference to the current guide frame.");
  }

  function adjustZoom(delta) {
    setZoom((current) => clamp(Math.round((current + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  }

  function handleWheel(event) {
    event.preventDefault();
    adjustZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  }

  function beginMove(event) {
    if (!stageRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragStateRef.current = {
      mode: "move",
      rect: stageRef.current.getBoundingClientRect(),
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOverlay: { ...signature },
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragStateRef.current) {
      return;
    }

    const { mode, rect, startClientX, startClientY, startOverlay } = dragStateRef.current;
    const scaleX = sourceSize.width / rect.width;
    const scaleY = sourceSize.height / rect.height;
    const dx = Math.round((event.clientX - startClientX) * scaleX);
    const dy = Math.round((event.clientY - startClientY) * scaleY);

    if (mode === "move") {
      updateSignature(() => ({
        ...startOverlay,
        x: clamp(startOverlay.x + dx, 0, sourceSize.width - startOverlay.width),
        y: clamp(startOverlay.y + dy, 0, sourceSize.height - startOverlay.height),
      }));
    }
  }

  function handlePointerUp(event) {
    if (!dragStateRef.current) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function startReveal() {
    setRevealProgress(0);
    setIsRevealRunning(false);
  }

  function pauseReveal() {
    setIsRevealRunning(false);
  }

  function resetReveal() {
    setRevealProgress(0);
    setIsRevealRunning(false);
  }

  function adjustRevealVisibility(delta) {
    setIsRevealRunning(false);
    setRevealProgress((current) => clamp(Math.round((current + delta) * 100) / 100, 0, 1));
  }

  function adjustRevealSpeed(delta) {
    setRevealSpeed((current) => clamp(Math.round((current + delta) * 100) / 100, REVEAL_MIN_SPEED, REVEAL_MAX_SPEED));
  }

  const exportPayload = JSON.stringify(
    {
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
      activeFrame: frameId,
      frameOverlay: signature,
      frames: signatureByFrame,
    },
    null,
    2
  );

  return (
    <div className="page">
      <main className="layout">
        <section className="stageCard">
          <div className="sectionHead">
            <div>
              <div className="eyebrow">Signature Reveal Calibration</div>
              <h1>Lock the card guide, tune the BoB signature</h1>
            </div>
            <div className="status">{status}</div>
          </div>

          <div className="frameTabs" role="tablist" aria-label="Reference frames">
            {frames.map((frame) => (
              <button
                key={frame.id}
                type="button"
                className={`frameTab ${frame.id === frameId ? "frameTabActive" : ""}`}
                onClick={() => setFrameId(frame.id)}
              >
                {frame.label}
              </button>
            ))}
          </div>

          <div className="zoomRow">
            <button type="button" className="secondaryButton" onClick={() => adjustZoom(-ZOOM_STEP)}>Zoom Out</button>
            <div className="zoomReadout">Zoom {Math.round(zoom * 100)}%</div>
            <button type="button" className="secondaryButton" onClick={() => adjustZoom(ZOOM_STEP)}>Zoom In</button>
            <button type="button" className="secondaryButton" onClick={() => setZoom(1)}>Reset Zoom</button>
          </div>

          <div className="stageWrap">
            {currentFrame ? (
              <div className="stageViewport" onWheel={handleWheel}>
                <div ref={stageRef} className="stage" style={{ width: `${zoom * 100}%` }}>
                  <img className="referenceFrame" src={currentFrame.src} alt={`Reference ${currentFrame.label}`} />

                  {showGuide ? (
                    <div
                      className="cardGuideBox"
                      style={{
                        left: `${(guide.x / sourceSize.width) * 100}%`,
                        top: `${(guide.y / sourceSize.height) * 100}%`,
                        width: `${(guide.width / sourceSize.width) * 100}%`,
                        height: `${(guide.height / sourceSize.height) * 100}%`,
                        transform: `rotate(${guide.rotation}deg)`,
                      }}
                    />
                  ) : null}
                  {trackedGuide ? (
                    <div
                      className="trackedGuideBox"
                      aria-hidden="true"
                      style={{
                        left: `${(trackedGuide.x / sourceSize.width) * 100}%`,
                        top: `${(trackedGuide.y / sourceSize.height) * 100}%`,
                        width: `${(trackedGuide.width / sourceSize.width) * 100}%`,
                        height: `${(trackedGuide.height / sourceSize.height) * 100}%`,
                        transform: `rotate(${trackedGuide.rotation}deg)`,
                      }}
                    />
                  ) : null}

                  <div
                    className="signatureBox"
                    onPointerDown={beginMove}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      left: `${(signature.x / sourceSize.width) * 100}%`,
                      top: `${(signature.y / sourceSize.height) * 100}%`,
                      width: `${(signature.width / sourceSize.width) * 100}%`,
                      height: `${(signature.height / sourceSize.height) * 100}%`,
                      transform: `rotate(${signature.rotation}deg)`,
                    }}
                  >
                    <img
                      className="signatureImage"
                      src="/api/fake-youtube-signature"
                      alt=""
                      style={{
                        opacity: 0.96,
                        maskImage: signatureMask,
                        WebkitMaskImage: signatureMask,
                        transform: `translate(${SIGNATURE_IMAGE_OFFSET_X}%, ${SIGNATURE_IMAGE_OFFSET_Y}%) rotate(${SIGNATURE_IMAGE_ROTATION}deg) scale(${SIGNATURE_IMAGE_SCALE})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="emptyStage">No frame selected.</div>
            )}
          </div>
        </section>

        <aside className="controlsCard">
          <div className="sectionHead compactHead">
            <div>
              <div className="eyebrow">Controls</div>
              <h2>Signature layer only</h2>
            </div>
          </div>

          <div className="stepRow">
            <label className="stepLabel" htmlFor="step-size">Adjustment size</label>
            <input
              id="step-size"
              className="stepInput"
              type="number"
              min="0.001"
              max="100"
              step="0.001"
              value={stepSize}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value);
                setStepSize(Number.isFinite(next) ? clamp(next, 0.001, 100) : DEFAULT_STEP_SIZE);
              }}
            />
            <div className="stepUnit">pixels</div>
          </div>

          <div className="revealControls">
            <button type="button" className="controlButton strong" onClick={startReveal}>
              Start BoB Overlay
            </button>
            <button type="button" className="controlButton" onClick={() => adjustRevealVisibility(-REVEAL_VISIBILITY_STEP)}>
              Decrease
            </button>
            <button type="button" className="controlButton" onClick={() => adjustRevealVisibility(REVEAL_VISIBILITY_STEP)}>
              Increase
            </button>
            <button type="button" className="controlButton" onClick={() => adjustRevealSpeed(-REVEAL_SPEED_STEP)}>
              Reveal Slower
            </button>
            <button type="button" className="controlButton" onClick={() => adjustRevealSpeed(REVEAL_SPEED_STEP)}>
              Reveal Faster
            </button>
            <button type="button" className="controlButton" onClick={pauseReveal}>
              Pause BoB Overlay
            </button>
            <button type="button" className="controlButton" onClick={resetReveal}>
              Reset Reveal
            </button>
            <button type="button" className="controlButton" onClick={() => setShowGuide((current) => !current)}>
              {showGuide ? "Hide Guide" : "Show Guide"}
            </button>
          </div>

          <div className="buttonGrid">
            <button type="button" className="controlButton" onClick={() => rotateSignature(-ROTATION_STEP)}>Rotate Left</button>
            <button type="button" className="controlButton" onClick={() => rotateSignature(ROTATION_STEP)}>Rotate Right</button>
            <button type="button" className="controlButton" onClick={() => nudgeSignature(0, -1)}>Up</button>
            <button type="button" className="controlButton" onClick={() => nudgeSignature(-1, 0)}>Left</button>
            <button type="button" className="controlButton" onClick={() => nudgeSignature(1, 0)}>Right</button>
            <button type="button" className="controlButton" onClick={() => nudgeSignature(0, 1)}>Down</button>
            <button type="button" className="controlButton" onClick={() => updateSignatureSize(1, 0)}>Increase Width</button>
            <button type="button" className="controlButton" onClick={() => updateSignatureSize(-1, 0)}>Decrease Width</button>
            <button type="button" className="controlButton" onClick={() => updateSignatureSize(0, 1)}>Increase Height</button>
            <button type="button" className="controlButton" onClick={() => updateSignatureSize(0, -1)}>Decrease Height</button>
          </div>

          <div className="actionRow">
            <button type="button" className="secondaryButton" onClick={resetCurrentFrame}>Reset Frame</button>
            <button type="button" className="secondaryButton" onClick={copyCurrentToAllFrames}>Copy To All</button>
          </div>
          <div className="trackingPanel">
            <div className="trackingPanelHeader">
              <strong>Tracking Reference</strong>
              <span>{trackingSnapshot?.tracking?.locked ? "Locked" : trackedGuide ? "Live" : "Missing"}</span>
            </div>
            <div className="note">
              {trackedGuide
                ? "The tracked card reference can be overlaid as a blue guide and applied to the current frame before you tune the signature reveal."
                : "Save a calibration snapshot with visible card tracking first to pull the tracked card reference into this reveal screen."}
            </div>
            <button type="button" className="secondaryButton" onClick={applyTrackedGuide} disabled={!trackedGuide}>
              Apply Tracking Guide
            </button>
          </div>

          <div className="readout">
            <div><strong>Frame:</strong> {currentFrame?.label ?? "None"}</div>
            <div><strong>X:</strong> {signature.x}px</div>
            <div><strong>Y:</strong> {signature.y}px</div>
            <div><strong>Width:</strong> {signature.width}px</div>
            <div><strong>Height:</strong> {signature.height}px</div>
            <div><strong>Rotation:</strong> {signature.rotation}deg</div>
            <div><strong>Step:</strong> {stepSize}px</div>
            <div><strong>Tracked Guide:</strong> {trackedGuide ? `${trackedGuide.width.toFixed(1)} x ${trackedGuide.height.toFixed(1)} px` : "None"}</div>
          </div>

          <div className="note">
            Drag the yellow signature layer, or use the buttons. The card guide is hidden unless you turn it on.
          </div>

          <div className="sectionHead compactHead">
            <div>
              <div className="eyebrow">Saved Data</div>
              <h2>Current JSON</h2>
            </div>
          </div>
          <textarea className="jsonBox" value={exportPayload} readOnly />
        </aside>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          overflow-y: auto;
          background:
            radial-gradient(circle at top, rgba(190, 210, 255, 0.45), rgba(255, 255, 255, 0) 38%),
            linear-gradient(180deg, #eef2f7 0%, #dde5ef 100%);
          color: #101828;
          padding: 24px;
        }

        .layout {
          max-width: 1500px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 20px;
          align-items: start;
        }

        .stageCard,
        .controlsCard {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.28);
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(12px);
        }

        .stageCard {
          padding: 20px;
        }

        .controlsCard {
          padding: 20px;
          display: grid;
          gap: 16px;
          align-content: start;
          max-height: calc(100vh - 48px);
          overflow-y: auto;
        }

        .sectionHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
          margin-bottom: 14px;
        }

        .compactHead {
          margin-bottom: 0;
        }

        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #5b6b83;
          margin-bottom: 6px;
        }

        h1,
        h2 {
          margin: 0;
          font-size: 22px;
          line-height: 1.15;
        }

        h2 {
          font-size: 18px;
        }

        .status {
          font-size: 13px;
          color: #475467;
          font-weight: 600;
        }

        .frameTabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .frameTab,
        .controlButton,
        .secondaryButton {
          border: 0;
          border-radius: 999px;
          background: #e7edf5;
          color: #10233b;
          font-weight: 700;
        }

        .frameTab {
          min-height: 34px;
          padding: 0 14px;
          font-size: 13px;
        }

        .frameTabActive {
          background: #10233b;
          color: #fff;
        }

        .stageWrap {
          display: flex;
          justify-content: center;
        }

        .zoomRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
        }

        .zoomReadout {
          min-width: 88px;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }

        .stageViewport {
          width: min(100%, 430px);
          aspect-ratio: 1080 / 1920;
          overflow: auto;
          border-radius: 18px;
          background: #0f172a;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .stage {
          position: relative;
          width: 100%;
          aspect-ratio: 1080 / 1920;
          overflow: hidden;
          touch-action: none;
        }

        .referenceFrame {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          user-select: none;
          pointer-events: none;
        }

        .cardGuideBox {
          position: absolute;
          box-sizing: border-box;
          border: 1px dashed rgba(148, 163, 184, 0.85);
          border-radius: 12px;
          outline: 1px solid rgba(15, 23, 42, 0.08);
          outline-offset: -1px;
          background: rgba(255, 255, 255, 0.03);
          pointer-events: none;
          z-index: 1;
          transform-origin: center;
        }

        .trackedGuideBox {
          position: absolute;
          box-sizing: border-box;
          border: 2px dashed rgba(59, 130, 246, 0.92);
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.06);
          pointer-events: none;
          z-index: 1;
          transform-origin: center;
        }

        .signatureBox {
          position: absolute;
          box-sizing: border-box;
          border: 1px dashed rgba(250, 204, 21, 0.95);
          border-radius: 12px;
          outline: 1px solid rgba(0, 0, 0, 0.18);
          outline-offset: -1px;
          background: rgba(250, 204, 21, 0.06);
          cursor: grab;
          transform-origin: center;
          touch-action: none;
          pointer-events: auto;
          z-index: 2;
        }

        .signatureBox:active {
          cursor: grabbing;
        }

        .signatureImage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform-origin: center;
          pointer-events: none;
          filter: saturate(1.08) contrast(1.08);
        }

        .emptyStage,
        .note {
          border-radius: 14px;
          background: #eef2f7;
          color: #475467;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.45;
        }

        .buttonGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .buttonGrid > :first-child,
        .buttonGrid > :nth-child(2) {
          background: #10233b;
          color: #fff;
        }

        .revealControls {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .revealControls > :first-child {
          grid-column: 1 / -1;
          background: #7c2d12;
          color: #fff;
        }

        .strong {
          font-weight: 800;
        }

        .stepRow {
          display: grid;
          grid-template-columns: auto 92px auto;
          gap: 10px;
          align-items: center;
        }

        .stepLabel {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }

        .stepInput {
          width: 100%;
          min-height: 42px;
          border: 1px solid #cdd5df;
          border-radius: 12px;
          padding: 0 12px;
          font-size: 14px;
          font-weight: 700;
          color: #10233b;
          background: #fff;
        }

        .stepInput::-webkit-outer-spin-button,
        .stepInput::-webkit-inner-spin-button {
          opacity: 1;
        }

        .stepUnit {
          font-size: 13px;
          color: #475467;
          font-weight: 600;
        }

        .controlButton,
        .secondaryButton {
          min-height: 42px;
          padding: 0 14px;
          font-size: 14px;
        }

        .actionRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .trackingPanel {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          background: #eef4ff;
          border: 1px solid rgba(59, 130, 246, 0.18);
        }

        .trackingPanelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
          color: #1d4ed8;
        }

        .readout {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 16px;
          background: #f7f9fc;
          font-size: 14px;
        }

        .jsonBox {
          width: 100%;
          min-height: 240px;
          resize: vertical;
          border: 1px solid #cdd5df;
          border-radius: 16px;
          padding: 12px;
          font: 12px/1.4 Consolas, monospace;
          background: #fff;
          color: #101828;
        }

        @media (max-width: 1100px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
