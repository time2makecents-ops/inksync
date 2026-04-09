"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildTrackedCardTransformFromSnapshot,
  buildOverlayCalibrationSnapshot,
  buildSignatureRevealCalibrationSnapshot,
  getStoredCalibrationSnapshot,
  getStoredOverlayCalibration,
  getStoredSignatureRevealCalibration,
  normalizeCardTransform,
  setStoredOverlayCalibration,
  setStoredSignatureRevealCalibration,
} from "../../lib/userPreferences";

const SOURCE_ASPECT_RATIO = 612 / 465;
const DEFAULT_ROTATION = -11.5;
const DEFAULT_FRAME_ID = "frame_03_0";
const ROTATION_STEP = 0.25;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const MIN_OVERLAY_SIZE = 12;
const HANDLE_GAP = 15;
const ROTATE_HANDLE_GAP = 30;
const HANDLE_SIZE = 12;
const REVEAL_SPEED_STEP = 0.05;
const REVEAL_MIN_SPEED = 0.05;
const REVEAL_MAX_SPEED = 3;
const REVEAL_VISIBILITY_STEP = 0.05;
const SIGNATURE_IMAGE_ROTATION = 0;
const SIGNATURE_IMAGE_SCALE = 0.9;
const SIGNATURE_IMAGE_OFFSET_X = 0;
const SIGNATURE_IMAGE_OFFSET_Y = 0;
const TARGET_FRAME_OVERLAYS = {
  frame_08_0: {
    x: 370,
    y: 1008,
    width: 191.2780000000002,
    height: 135.515,
    rotation: -9.25,
  },
  frame_08_5: {
    x: 370,
    y: 1008,
    width: 191.2780000000002,
    height: 135.515,
    rotation: -9.25,
  },
  frame_09_0: {
    x: 370,
    y: 1008,
    width: 191.2780000000002,
    height: 135.515,
    rotation: -9.25,
  },
  frame_09_5: {
    x: 370,
    y: 1008,
    width: 191.2780000000002,
    height: 135.515,
    rotation: -9.25,
  },
  frame_10_0: {
    x: 370,
    y: 1008,
    width: 191.2780000000002,
    height: 135.515,
    rotation: -9.25,
  },
};
const DEFAULT_OVERLAY = {
  x: 395,
  y: 1158,
  width: 239,
  height: 91,
  rotation: DEFAULT_ROTATION,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeOverlay(overlay) {
  const width = typeof overlay?.width === "number" ? overlay.width : DEFAULT_OVERLAY.width;
  return {
    x: typeof overlay?.x === "number" ? overlay.x : DEFAULT_OVERLAY.x,
    y: typeof overlay?.y === "number" ? overlay.y : DEFAULT_OVERLAY.y,
    width,
    height:
      typeof overlay?.height === "number"
        ? overlay.height
        : Math.round(width / SOURCE_ASPECT_RATIO),
    rotation: typeof overlay?.rotation === "number" ? overlay.rotation : DEFAULT_OVERLAY.rotation,
  };
}

function frameIdToSeconds(frameId) {
  const match = /^frame_(\d+)_(\d+)$/.exec(frameId);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10) / 10;
}

function interpolateValue(start, end, progress) {
  return start + ((end - start) * progress);
}

function interpolateOverlay(startOverlay, endOverlay, progress) {
  return normalizeOverlay({
    x: interpolateValue(startOverlay.x, endOverlay.x, progress),
    y: interpolateValue(startOverlay.y, endOverlay.y, progress),
    width: interpolateValue(startOverlay.width, endOverlay.width, progress),
    height: interpolateValue(startOverlay.height, endOverlay.height, progress),
    rotation: interpolateValue(startOverlay.rotation, endOverlay.rotation, progress),
  });
}

export default function OverlayCalibrationScreen({ mode = "overlay" }) {
  const stageRef = useRef(null);
  const dragStateRef = useRef(null);
  const [frames, setFrames] = useState([]);
  const [frameId, setFrameId] = useState(DEFAULT_FRAME_ID);
  const [sourceSize, setSourceSize] = useState({ width: 1080, height: 1920 });
  const [cardGuideByFrame, setCardGuideByFrame] = useState({});
  const [overlaysByFrame, setOverlaysByFrame] = useState({});
  const [keyframeIds, setKeyframeIds] = useState([]);
  const [status, setStatus] = useState("Loading reference frames...");
  const [zoom, setZoom] = useState(1);
  const [stepSize, setStepSize] = useState(1);
  const [revealProgress, setRevealProgress] = useState(0);
  const [revealSpeed, setRevealSpeed] = useState(0.45);
  const [isRevealRunning, setIsRevealRunning] = useState(false);
  const [trackingSnapshot, setTrackingSnapshot] = useState(null);
  const isRevealMode = mode === "reveal";

  useEffect(() => {
    let cancelled = false;

    async function loadFrames() {
      try {
        const response = await fetch("/api/overlay-reference-frames", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setFrames(payload.frames ?? []);
        setSourceSize({
          width: payload.sourceWidth ?? 1080,
          height: payload.sourceHeight ?? 1920,
        });

        const stored = isRevealMode
          ? getStoredSignatureRevealCalibration()
          : getStoredOverlayCalibration();
        if (stored?.frames && typeof stored.frames === "object") {
          const normalizedFrames = Object.fromEntries(
            Object.entries(stored.frames).map(([key, value]) => [key, normalizeOverlay(normalizeCardTransform(value, DEFAULT_OVERLAY))])
          );
          setOverlaysByFrame(normalizedFrames);
          setKeyframeIds(Array.isArray(stored.keyframes) ? stored.keyframes : Object.keys(normalizedFrames));
        }

        setTrackingSnapshot(getStoredCalibrationSnapshot());

        try {
          const backupResponse = await fetch(
            isRevealMode ? "/api/signature-reveal-calibration-backup" : "/api/overlay-calibration-backup",
            { cache: "no-store" }
          );
          if (backupResponse.ok) {
            const backupPayload = await backupResponse.json();
            if (backupPayload?.frames && typeof backupPayload.frames === "object") {
              const backupFrames = Object.fromEntries(
                Object.entries(backupPayload.frames).map(([key, value]) => [key, normalizeOverlay(value)])
              );
              setOverlaysByFrame((current) => ({ ...backupFrames, ...current }));
              setKeyframeIds((current) => current.length ? current : Object.keys(backupFrames));
            }
          }
        } catch {
          // Ignore backup load failures; localStorage still works.
        }

        if (isRevealMode) {
          try {
            const guideResponse = await fetch("/api/overlay-calibration-backup", { cache: "no-store" });
            if (guideResponse.ok) {
              const guidePayload = await guideResponse.json();
              if (guidePayload?.frames && typeof guidePayload.frames === "object") {
                const guideFrames = Object.fromEntries(
                  Object.entries(guidePayload.frames).map(([key, value]) => [key, normalizeOverlay(value)])
                );
                setCardGuideByFrame(guideFrames);
              }
            }
          } catch {
            // Ignore guide load failures; the fallback target frames still render.
          }
        } else {
          setOverlaysByFrame((current) => {
            const next = { ...current };
            for (const [targetFrameId, targetOverlay] of Object.entries(TARGET_FRAME_OVERLAYS)) {
              next[targetFrameId] = normalizeOverlay(targetOverlay);
            }
            return next;
          });
          setKeyframeIds((current) => current.length ? current : Object.keys(TARGET_FRAME_OVERLAYS));
        }
        setStepSize(0.001);

        if (payload.frames?.length) {
          setFrameId((current) =>
            payload.frames.some((frame) => frame.id === current) ? current : payload.frames[0].id
          );
          setStatus("Reference frames ready.");
        } else {
          setStatus("No sampled frames found in scratch_frames.");
        }
      } catch (error) {
        setStatus(`Unable to load reference frames: ${error.message}`);
      }
    }

    loadFrames();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Object.keys(overlaysByFrame).length) {
      return;
    }

    const snapshotBuilder = isRevealMode
      ? buildSignatureRevealCalibrationSnapshot
      : buildOverlayCalibrationSnapshot;
    const snapshot = snapshotBuilder({
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
      activeFrame: frameId,
      frameOverlay: normalizeOverlay(overlaysByFrame[frameId] ?? DEFAULT_OVERLAY),
      frames: overlaysByFrame,
      keyframes: keyframeIds,
      updatedAt: new Date().toISOString(),
    }, DEFAULT_OVERLAY);

    if (isRevealMode) {
      setStoredSignatureRevealCalibration(snapshot);
    } else {
      setStoredOverlayCalibration(snapshot);
    }

    fetch(isRevealMode ? "/api/signature-reveal-calibration-backup" : "/api/overlay-calibration-backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
    }).catch(() => {});
  }, [frameId, isRevealMode, keyframeIds, overlaysByFrame, sourceSize.height, sourceSize.width]);

  useEffect(() => {
    if (!isRevealMode || !isRevealRunning) {
      return undefined;
    }

    let lastTimestamp = null;
    let rafId = null;

    function tick(timestamp) {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      setRevealProgress((current) => {
        const next = Math.min(1, current + deltaSeconds * revealSpeed);
        return next;
      });

      rafId = window.requestAnimationFrame(tick);
    }

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isRevealMode, isRevealRunning, revealSpeed]);

  const currentFrame = useMemo(
    () => frames.find((frame) => frame.id === frameId) ?? null,
    [frameId, frames]
  );
  const sortedKeyframeIds = useMemo(
    () => [...new Set(keyframeIds)]
      .filter((keyframeId) => overlaysByFrame[keyframeId])
      .sort((left, right) => (frameIdToSeconds(left) ?? 0) - (frameIdToSeconds(right) ?? 0)),
    [keyframeIds, overlaysByFrame]
  );
  const overlay = useMemo(() => {
    if (overlaysByFrame[frameId]) {
      return normalizeOverlay(overlaysByFrame[frameId]);
    }

    const currentSeconds = frameIdToSeconds(frameId);
    if (currentSeconds === null || !sortedKeyframeIds.length) {
      return DEFAULT_OVERLAY;
    }

    let previousKeyframeId = null;
    let nextKeyframeId = null;
    for (const keyframeId of sortedKeyframeIds) {
      const keyframeSeconds = frameIdToSeconds(keyframeId);
      if (keyframeSeconds === null) {
        continue;
      }
      if (keyframeSeconds <= currentSeconds) {
        previousKeyframeId = keyframeId;
      }
      if (keyframeSeconds >= currentSeconds) {
        nextKeyframeId = keyframeId;
        break;
      }
    }

    if (previousKeyframeId && nextKeyframeId && previousKeyframeId !== nextKeyframeId) {
      const previousSeconds = frameIdToSeconds(previousKeyframeId);
      const nextSeconds = frameIdToSeconds(nextKeyframeId);
      if (previousSeconds !== null && nextSeconds !== null && nextSeconds > previousSeconds) {
        const progress = (currentSeconds - previousSeconds) / (nextSeconds - previousSeconds);
        return interpolateOverlay(
          normalizeOverlay(overlaysByFrame[previousKeyframeId]),
          normalizeOverlay(overlaysByFrame[nextKeyframeId]),
          clamp(progress, 0, 1)
        );
      }
    }

    if (previousKeyframeId) {
      return normalizeOverlay(overlaysByFrame[previousKeyframeId]);
    }
    if (nextKeyframeId) {
      return normalizeOverlay(overlaysByFrame[nextKeyframeId]);
    }
    return DEFAULT_OVERLAY;
  }, [frameId, overlaysByFrame, sortedKeyframeIds]);
  const isKeyframe = keyframeIds.includes(frameId);
  const trackedOverlay = useMemo(
    () => {
      const tracked = buildTrackedCardTransformFromSnapshot(trackingSnapshot, sourceSize, overlay);
      return tracked ? normalizeOverlay(tracked) : null;
    },
    [overlay, sourceSize, trackingSnapshot]
  );
  const cardGuide = useMemo(() => {
    if (!isRevealMode) {
      return null;
    }

    return normalizeOverlay(
      cardGuideByFrame[frameId] ?? TARGET_FRAME_OVERLAYS[frameId] ?? DEFAULT_OVERLAY
    );
  }, [cardGuideByFrame, frameId, isRevealMode]);
  const pageTitle = isRevealMode ? "Signature Reveal Calibration" : "Overlay Calibration";
  const pageSubtitle = isRevealMode
    ? "Tune the BoB signature reveal against the sampled magician frames."
    : "Line up the dotted card box against the magician card";
  const signatureLayer = isRevealMode
    ? overlay
    : null;

  function updateOverlay(updater) {
    setOverlaysByFrame((current) => {
      const existing = current[frameId] ?? overlay;
      const next = typeof updater === "function" ? updater(normalizeOverlay(existing)) : normalizeOverlay(updater);
      return {
        ...current,
        [frameId]: normalizeOverlay(next),
      };
    });
    setKeyframeIds((current) => (current.includes(frameId) ? current : [...current, frameId]));
  }

  function clampOverlay(nextOverlay) {
    const normalized = normalizeOverlay(nextOverlay);
    const maxWidth = sourceSize.width;
    const maxHeight = sourceSize.height;
    const width = clamp(normalized.width, MIN_OVERLAY_SIZE, maxWidth);
    const height = clamp(normalized.height, MIN_OVERLAY_SIZE, maxHeight);
    return {
      ...normalized,
      width,
      height,
      x: clamp(normalized.x, 0, maxWidth - width),
      y: clamp(normalized.y, 0, maxHeight - height),
    };
  }

  function nudge(dx, dy) {
    updateOverlay((current) => ({
      ...current,
      x: clamp(current.x + dx * stepSize, 0, sourceSize.width),
      y: clamp(current.y + dy * stepSize, 0, sourceSize.height),
    }));
  }

  function resize(delta) {
    updateOverlay((current) => ({
      ...(isRevealMode
        ? (() => {
            const nextWidth = clamp(current.width + delta * stepSize, 40, sourceSize.width);
            const centerX = current.x + current.width / 2;
            return {
              ...current,
              width: nextWidth,
              x: clamp(centerX - nextWidth / 2, 0, sourceSize.width - nextWidth),
            };
          })()
        : {
            ...current,
            width: clamp(current.width + delta * stepSize, 40, sourceSize.width),
          }),
    }));
  }

  function resizeHeight(delta) {
    updateOverlay((current) => ({
      ...(isRevealMode
        ? (() => {
            const nextHeight = clamp(current.height + delta * stepSize, 40, sourceSize.height);
            const centerY = current.y + current.height / 2;
            return {
              ...current,
              height: nextHeight,
              y: clamp(centerY - nextHeight / 2, 0, sourceSize.height - nextHeight),
            };
          })()
        : {
            ...current,
            height: clamp(current.height + delta * stepSize, 40, sourceSize.height),
          }),
    }));
  }

  function rotate(delta) {
    updateOverlay((current) => ({
      ...current,
      rotation: Math.round((current.rotation + delta) * 100) / 100,
    }));
  }

  function startReveal() {
    if (!isRevealMode) {
      return;
    }

    setRevealProgress(0);
    setIsRevealRunning(false);
  }

  function pauseReveal() {
    if (!isRevealMode) {
      return;
    }

    setIsRevealRunning(false);
  }

  function resetReveal() {
    if (!isRevealMode) {
      return;
    }

    setIsRevealRunning(false);
    setRevealProgress(0);
  }

  function adjustRevealSpeed(delta) {
    if (!isRevealMode) {
      return;
    }

    setRevealSpeed((current) => clamp(Math.round((current + delta) * 100) / 100, REVEAL_MIN_SPEED, REVEAL_MAX_SPEED));
  }

  function adjustRevealVisibility(delta) {
    if (!isRevealMode) {
      return;
    }

    setIsRevealRunning(false);
    setRevealProgress((current) => clamp(Math.round((current + delta) * 100) / 100, 0, 1));
  }

  function resetCurrentFrame() {
    updateOverlay({ ...DEFAULT_OVERLAY });
  }

  function adjustZoom(delta) {
    setZoom((current) => {
      const next = Math.round((current + delta) * 100) / 100;
      return clamp(next, MIN_ZOOM, MAX_ZOOM);
    });
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

    const rect = stageRef.current.getBoundingClientRect();
    dragStateRef.current = {
      mode: "move",
      rect,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOverlay: { ...overlay },
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function beginResize(edge, event) {
    if (!stageRef.current) {
      return;
    }

    const rect = stageRef.current.getBoundingClientRect();
    dragStateRef.current = {
      mode: "resize",
      edge,
      rect,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOverlay: { ...overlay },
    };

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function beginRotate(event) {
    if (!stageRef.current) {
      return;
    }

    const rect = stageRef.current.getBoundingClientRect();
    dragStateRef.current = {
      mode: "rotate",
      rect,
      startClientY: event.clientY,
      startRotation: overlay.rotation,
      startOverlay: { ...overlay },
    };

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function copyToAllFrames() {
    setOverlaysByFrame((current) => {
      const next = { ...current };
      const sourceOverlay = normalizeOverlay(current[frameId] ?? DEFAULT_OVERLAY);
      for (const frame of frames) {
        next[frame.id] = { ...sourceOverlay };
      }
      return next;
    });
    setKeyframeIds(frames.map((frame) => frame.id));
  }

  function addKeyframe() {
    updateOverlay(overlay);
    setStatus("Saved the current frame as a keyframe.");
  }

  function removeKeyframe() {
    setKeyframeIds((current) => current.filter((keyframeId) => keyframeId !== frameId));
    setOverlaysByFrame((current) => {
      const next = { ...current };
      delete next[frameId];
      return next;
    });
    setStatus("Removed the current keyframe. The frame will now inherit or interpolate.");
  }

  function jumpToKeyframe(direction) {
    if (!sortedKeyframeIds.length) {
      return;
    }

    const currentSeconds = frameIdToSeconds(frameId) ?? 0;
    const ordered = sortedKeyframeIds
      .map((keyframeId) => ({ keyframeId, seconds: frameIdToSeconds(keyframeId) ?? 0 }))
      .sort((left, right) => left.seconds - right.seconds);

    if (direction < 0) {
      const previous = [...ordered].reverse().find((entry) => entry.seconds < currentSeconds);
      if (previous) {
        setFrameId(previous.keyframeId);
      }
      return;
    }

    const next = ordered.find((entry) => entry.seconds > currentSeconds);
    if (next) {
      setFrameId(next.keyframeId);
    }
  }

  function applyTrackedReference() {
    if (!trackedOverlay || isRevealMode) {
      return;
    }

    updateOverlay(trackedOverlay);
    setStatus("Applied the tracked card reference to the current overlay frame.");
  }

  function handlePointerDown(event) {
    beginMove(event);
  }

  function handlePointerMove(event) {
    if (!dragStateRef.current) {
      return;
    }

    const { mode, edge, rect, startClientX, startClientY, startOverlay, startRotation } = dragStateRef.current;
    const scaleX = sourceSize.width / rect.width;
    const scaleY = sourceSize.height / rect.height;
    const dx = Math.round((event.clientX - startClientX) * scaleX);
    const dy = Math.round((event.clientY - startClientY) * scaleY);

    if (mode === "rotate") {
      const deltaDegrees = (dragStateRef.current.startClientY - event.clientY) * 0.25;
      updateOverlay((current) => ({
        ...current,
        rotation: Math.round((startRotation + deltaDegrees) * 100) / 100,
      }));
      return;
    }

    if (mode === "resize") {
      updateOverlay(() => {
        let next = { ...startOverlay };
        const edgeName = edge ?? "";

        if (edgeName.includes("left")) {
          const nextX = clamp(startOverlay.x + dx, 0, startOverlay.x + startOverlay.width - MIN_OVERLAY_SIZE);
          const right = startOverlay.x + startOverlay.width;
          next = {
            ...next,
            x: nextX,
            width: clamp(right - nextX, MIN_OVERLAY_SIZE, sourceSize.width),
          };
        }

        if (edgeName.includes("right")) {
          const nextWidth = clamp(startOverlay.width + dx, MIN_OVERLAY_SIZE, sourceSize.width - startOverlay.x);
          next = { ...next, width: nextWidth };
        }

        if (edgeName.includes("top")) {
          const nextY = clamp(startOverlay.y + dy, 0, startOverlay.y + startOverlay.height - MIN_OVERLAY_SIZE);
          const bottom = startOverlay.y + startOverlay.height;
          next = {
            ...next,
            y: nextY,
            height: clamp(bottom - nextY, MIN_OVERLAY_SIZE, sourceSize.height),
          };
        }

        if (edgeName.includes("bottom")) {
          const nextHeight = clamp(startOverlay.height + dy, MIN_OVERLAY_SIZE, sourceSize.height - startOverlay.y);
          next = { ...next, height: nextHeight };
        }

        return clampOverlay(next);
      });
      return;
    }

    updateOverlay(() => ({
      ...startOverlay,
      x: clamp(startOverlay.x + dx, 0, sourceSize.width),
      y: clamp(startOverlay.y + dy, 0, sourceSize.height),
    }));
  }

  function handlePointerUp(event) {
    if (!dragStateRef.current) {
      return;
    }

    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const exportPayload = JSON.stringify(
    {
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
      activeFrame: frameId,
      frameOverlay: overlay,
      frames: overlaysByFrame,
      keyframes: keyframeIds,
    },
    null,
    2
  );
  const signatureRevealMask = `linear-gradient(90deg, rgba(0, 0, 0, 1) ${Math.max(
    0,
    revealProgress * 100 - 12
  )}%, rgba(0, 0, 0, 0.88) ${Math.max(0, revealProgress * 100 - 3)}%, rgba(0, 0, 0, 0) ${Math.min(
    100,
    revealProgress * 100 + 8
  )}%)`;

  const handlePositions = [
    {
      key: "top-left",
      className: "handleTopLeft",
      style: {
        left: `-${HANDLE_GAP}px`,
        top: `-${HANDLE_GAP}px`,
        transform: "translate(-50%, -50%)",
      },
      cursor: "nwse-resize",
      edge: "top-left",
    },
    {
      key: "top",
      className: "handleTop",
      style: {
        left: "50%",
        top: `-${HANDLE_GAP}px`,
        transform: "translate(-50%, -50%)",
      },
      cursor: "ns-resize",
      edge: "top",
    },
    {
      key: "top-right",
      className: "handleTopRight",
      style: {
        right: `-${HANDLE_GAP}px`,
        top: `-${HANDLE_GAP}px`,
        transform: "translate(50%, -50%)",
      },
      cursor: "nesw-resize",
      edge: "top-right",
    },
    {
      key: "right",
      className: "handleRight",
      style: {
        right: `-${HANDLE_GAP}px`,
        top: "50%",
        transform: "translate(50%, -50%)",
      },
      cursor: "ew-resize",
      edge: "right",
    },
    {
      key: "bottom-right",
      className: "handleBottomRight",
      style: {
        right: `-${HANDLE_GAP}px`,
        bottom: `-${HANDLE_GAP}px`,
        transform: "translate(50%, 50%)",
      },
      cursor: "nwse-resize",
      edge: "bottom-right",
    },
    {
      key: "bottom",
      className: "handleBottom",
      style: {
        left: "50%",
        bottom: `-${HANDLE_GAP}px`,
        transform: "translate(-50%, 50%)",
      },
      cursor: "ns-resize",
      edge: "bottom",
    },
    {
      key: "bottom-left",
      className: "handleBottomLeft",
      style: {
        left: `-${HANDLE_GAP}px`,
        bottom: `-${HANDLE_GAP}px`,
        transform: "translate(-50%, 50%)",
      },
      cursor: "nesw-resize",
      edge: "bottom-left",
    },
    {
      key: "left",
      className: "handleLeft",
      style: {
        left: `-${HANDLE_GAP}px`,
        top: "50%",
        transform: "translate(-50%, -50%)",
      },
      cursor: "ew-resize",
      edge: "left",
    },
  ];

  return (
    <div className="overlayCalibrationPage">
      <main className="layout">
        <section className="stageCard">
          <div className="sectionHead">
            <div>
              <div className="eyebrow">{pageTitle}</div>
              <h1>{pageSubtitle}</h1>
            </div>
            <div className="status">{status}</div>
          </div>

          <div className="frameTabs" role="tablist" aria-label="Reference frames">
            {frames.map((frame) => (
              <button
                key={frame.id}
                type="button"
                className={`frameTab ${frame.id === frameId ? "frameTabActive" : ""} ${keyframeIds.includes(frame.id) ? "frameTabKeyframe" : ""}`}
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
                <div
                  ref={stageRef}
                  className="stage"
                  style={{
                    width: `${zoom * 100}%`,
                  }}
                >
                  <img className="referenceFrame" src={currentFrame.src} alt={`Reference ${currentFrame.label}`} />
                  {isRevealMode && cardGuide ? (
                    <div
                      className="cardGuideBox"
                      style={{
                        left: `${(cardGuide.x / sourceSize.width) * 100}%`,
                        top: `${(cardGuide.y / sourceSize.height) * 100}%`,
                        width: `${(cardGuide.width / sourceSize.width) * 100}%`,
                        height: `${(cardGuide.height / sourceSize.height) * 100}%`,
                        transform: `rotate(${cardGuide.rotation}deg)`,
                      }}
                    />
                  ) : null}
                  {isRevealMode && signatureLayer ? (
                    <div
                      className="signatureStageLayer overlayBox signatureEditBox"
                      onPointerDown={beginMove}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{
                        left: `${(signatureLayer.x / sourceSize.width) * 100}%`,
                        top: `${(signatureLayer.y / sourceSize.height) * 100}%`,
                        width: `${(signatureLayer.width / sourceSize.width) * 100}%`,
                        height: `${(signatureLayer.height / sourceSize.height) * 100}%`,
                        transform: `rotate(${signatureLayer.rotation}deg)`,
                      }}
                    >
                      <img
                        className="revealSignature"
                        src="/api/fake-youtube-signature"
                        alt=""
                        style={{
                          opacity: isRevealRunning || revealProgress > 0 ? 0.96 : 0.05,
                          maskImage: signatureRevealMask,
                          WebkitMaskImage: signatureRevealMask,
                          transform: `translate(${SIGNATURE_IMAGE_OFFSET_X}%, ${SIGNATURE_IMAGE_OFFSET_Y}%) rotate(${SIGNATURE_IMAGE_ROTATION}deg) scale(${SIGNATURE_IMAGE_SCALE})`,
                        }}
                      />
                      {handlePositions.map((handle) => (
                        <div
                          key={handle.key}
                          className={`resizeHandle ${handle.className}`}
                          onPointerDown={(event) => beginResize(handle.edge, event)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          style={{
                            cursor: handle.cursor,
                            ...handle.style,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {!isRevealMode ? (
                    <>
                      {trackedOverlay ? (
                        <div
                          className="trackedGuideBox"
                          aria-hidden="true"
                          style={{
                            left: `${(trackedOverlay.x / sourceSize.width) * 100}%`,
                            top: `${(trackedOverlay.y / sourceSize.height) * 100}%`,
                            width: `${(trackedOverlay.width / sourceSize.width) * 100}%`,
                            height: `${(trackedOverlay.height / sourceSize.height) * 100}%`,
                            transform: `rotate(${trackedOverlay.rotation}deg)`,
                          }}
                        />
                      ) : null}
                      <div
                      className="overlayBox"
                      onPointerDown={beginMove}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{
                        left: `${(overlay.x / sourceSize.width) * 100}%`,
                        top: `${(overlay.y / sourceSize.height) * 100}%`,
                        width: `${(overlay.width / sourceSize.width) * 100}%`,
                        height: `${(overlay.height / sourceSize.height) * 100}%`,
                        transform: `rotate(${overlay.rotation}deg)`,
                      }}
                    >
                      {handlePositions.map((handle) => (
                        <div
                          key={handle.key}
                          className={`resizeHandle ${handle.className}`}
                          onPointerDown={(event) => beginResize(handle.edge, event)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          style={{
                            cursor: handle.cursor,
                            ...handle.style,
                          }}
                        />
                      ))}
                      {!isRevealMode ? (
                        <button
                          type="button"
                          className="rotateHandle"
                          style={{
                            right: `-${ROTATE_HANDLE_GAP}px`,
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                          onPointerDown={beginRotate}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          aria-label="Rotate overlay"
                        />
                      ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="emptyStage">No frame selected.</div>
            )}
          </div>
        </section>

        <aside className="controlsCard">
          <div className="sectionHead">
            <div>
              <div className="eyebrow">Controls</div>
              <h2>Precision adjustments</h2>
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
                setStepSize(Number.isFinite(next) ? clamp(next, 0.001, 100) : 0.001);
              }}
            />
            <div className="stepUnit">pixels</div>
          </div>

          {isRevealMode ? (
            <div className="revealControls">
              <button type="button" className="controlButton" onClick={startReveal}>
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
            </div>
          ) : null}

          <div className="buttonGrid">
            <button type="button" className="controlButton" onClick={() => rotate(-ROTATION_STEP)}>Rotate Left</button>
            <button type="button" className="controlButton" onClick={() => rotate(ROTATION_STEP)}>Rotate Right</button>
            <button type="button" className="controlButton" onClick={() => nudge(0, -1)}>Up</button>
            <button type="button" className="controlButton" onClick={() => nudge(-1, 0)}>Left</button>
            <button type="button" className="controlButton" onClick={() => nudge(1, 0)}>Right</button>
            <button type="button" className="controlButton" onClick={() => nudge(0, 1)}>Down</button>
            <button type="button" className="controlButton" onClick={() => resize(1)}>Increase Width</button>
            <button type="button" className="controlButton" onClick={() => resize(-1)}>Decrease Width</button>
            <button type="button" className="controlButton" onClick={() => resizeHeight(1)}>Increase Height</button>
            <button type="button" className="controlButton" onClick={() => resizeHeight(-1)}>Decrease Height</button>
          </div>

          <div className="actionRow">
            <button type="button" className="secondaryButton" onClick={resetCurrentFrame}>Reset Frame</button>
            <button type="button" className="secondaryButton" onClick={copyToAllFrames}>Copy To All</button>
          </div>
          {!isRevealMode ? (
            <div className="trackingPanel">
              <div className="trackingPanelHeader">
                <strong>Keyframes</strong>
                <span>{isKeyframe ? "Manual" : "Interpolated"}</span>
              </div>
              <div className="actionRow">
                <button type="button" className="secondaryButton" onClick={addKeyframe}>
                  {isKeyframe ? "Update Keyframe" : "Add Keyframe"}
                </button>
                <button type="button" className="secondaryButton" onClick={removeKeyframe} disabled={!isKeyframe}>
                  Remove Keyframe
                </button>
              </div>
              <div className="actionRow">
                <button type="button" className="secondaryButton" onClick={() => jumpToKeyframe(-1)}>
                  Prev Keyframe
                </button>
                <button type="button" className="secondaryButton" onClick={() => jumpToKeyframe(1)}>
                  Next Keyframe
                </button>
              </div>
              <div className="note">
                Manual keyframes persist on sampled frames. Non-keyframe frames interpolate between the nearest saved keyframes.
              </div>
            </div>
          ) : null}
          {!isRevealMode ? (
            <div className="trackingPanel">
              <div className="trackingPanelHeader">
                <strong>Tracking Reference</strong>
                <span>{trackingSnapshot?.tracking?.locked ? "Locked" : trackedOverlay ? "Live" : "Missing"}</span>
              </div>
              <p className="note">
                {trackedOverlay
                  ? "Use the saved calibration tracking transform as a guide, then apply it to the current overlay frame when the alignment looks correct."
                  : "Save a calibration snapshot with visible card tracking first to attach the overlay to a tracked card reference."}
              </p>
              <button type="button" className="secondaryButton" onClick={applyTrackedReference} disabled={!trackedOverlay}>
                Apply Tracking Reference
              </button>
            </div>
          ) : null}

          <div className="readout">
            <div><strong>Frame:</strong> {currentFrame?.label ?? "None"}</div>
            <div><strong>X:</strong> {overlay.x}px</div>
            <div><strong>Y:</strong> {overlay.y}px</div>
            <div><strong>Width:</strong> {overlay.width}px</div>
            <div><strong>Height:</strong> {overlay.height}px</div>
            <div><strong>Rotation:</strong> {overlay.rotation}deg</div>
            <div><strong>Step:</strong> {stepSize}px</div>
            <div><strong>Keyframe:</strong> {isKeyframe ? "Yes" : "Interpolated"}</div>
            <div><strong>Tracked:</strong> {trackedOverlay ? `${trackedOverlay.width.toFixed(1)} x ${trackedOverlay.height.toFixed(1)} px` : "None"}</div>
          </div>

          <div className="note">
            Drag the dotted box directly on the frame or use the buttons. Every button press is one source pixel.
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
        .overlayCalibrationPage {
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

        .frameTabKeyframe {
          box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.35);
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

        .overlayBox {
          position: absolute;
          box-sizing: border-box;
          border: 1px dashed #facc15;
          border-radius: 12px;
          outline: 1px solid rgba(0, 0, 0, 0.18);
          outline-offset: -1px;
          background: rgba(250, 204, 21, 0.08);
          cursor: grab;
          transform-origin: center;
          touch-action: none;
          pointer-events: auto;
          z-index: 2;
        }

        .signatureEditBox {
          border-color: rgba(250, 204, 21, 0.95);
          background: rgba(250, 204, 21, 0.05);
        }

        .cardGuideBox {
          position: absolute;
          box-sizing: border-box;
          border: 1px dashed rgba(148, 163, 184, 0.75);
          border-radius: 12px;
          outline: 1px solid rgba(15, 23, 42, 0.08);
          outline-offset: -1px;
          background: rgba(255, 255, 255, 0.03);
          pointer-events: none;
          z-index: 1;
          transform-origin: top left;
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

        .signatureStageLayer {
          position: absolute;
          box-sizing: border-box;
          pointer-events: auto;
          z-index: 2;
          transform-origin: center;
          touch-action: none;
        }

        .overlayBox:active {
          cursor: grabbing;
        }

        .overlayBox::before {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 16px;
        }

        .revealSignature {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform-origin: center;
          pointer-events: none;
          filter: saturate(1.08) contrast(1.08);
        }

        .resizeHandle {
          position: absolute;
          width: ${HANDLE_SIZE}px;
          height: ${HANDLE_SIZE}px;
          background: rgba(250, 204, 21, 0.98);
          border: 1px solid rgba(0, 0, 0, 0.24);
          border-radius: 999px;
          pointer-events: auto;
          z-index: 3;
          touch-action: none;
        }

        .resizeHandle::after {
          content: "";
          position: absolute;
          inset: -8px;
        }

        .handleTopLeft {
          left: -${HANDLE_GAP}px;
          top: -${HANDLE_GAP}px;
          transform: translate(-50%, -50%);
        }

        .handleTop {
          left: 50%;
          top: -${HANDLE_GAP}px;
          transform: translate(-50%, -50%);
        }

        .handleTopRight {
          right: -${HANDLE_GAP}px;
          top: -${HANDLE_GAP}px;
          transform: translate(50%, -50%);
        }

        .handleRight {
          right: -${HANDLE_GAP}px;
          top: 50%;
          transform: translate(50%, -50%);
        }

        .handleBottomRight {
          right: -${HANDLE_GAP}px;
          bottom: -${HANDLE_GAP}px;
          transform: translate(50%, 50%);
        }

        .handleBottom {
          left: 50%;
          bottom: -${HANDLE_GAP}px;
          transform: translate(-50%, 50%);
        }

        .handleBottomLeft {
          left: -${HANDLE_GAP}px;
          bottom: -${HANDLE_GAP}px;
          transform: translate(-50%, 50%);
        }

        .handleLeft {
          left: -${HANDLE_GAP}px;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .rotateHandle {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #facc15;
          border: 1px solid rgba(0, 0, 0, 0.24);
          pointer-events: auto;
          z-index: 3;
          cursor: grab;
          touch-action: none;
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



