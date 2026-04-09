"use client";

import { useEffect, useRef, useState } from "react";

import {
  buildCalibrationSnapshot,
  getStoredCalibrationSnapshot,
  setStoredCalibrationSnapshot,
} from "../../lib/userPreferences";

const TARGET_BOX = {
  centerX: 0.5,
  centerY: 0.54,
  minArea: 0.12,
  maxArea: 0.34,
  minAspect: 0.66,
  maxAspect: 0.86,
};

const DEFAULT_METRICS = {
  brightness: 0,
  sharpness: 0,
  motion: 0,
  areaRatio: 0,
  aspectRatio: 0,
  centerX: 0,
  centerY: 0,
  boxWidthRatio: 0,
  boxHeightRatio: 0,
  rotation: 0,
  corners: [],
  confidence: 0,
  foundCard: false,
};

const DEFAULT_CAPTURE_REVIEW = {
  readiness: "not_ready",
  score: 0,
  summary: "No timed photo captured yet.",
  notes: [],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreBand(value, min, max) {
  if (value < min) {
    return clamp(value / Math.max(min, 1e-6), 0, 1);
  }
  if (value > max) {
    return clamp((max * 2 - value) / Math.max(max, 1e-6), 0, 1);
  }
  return 1;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value) {
  return Number(value || 0).toFixed(1);
}

function normalizeDegrees(angle) {
  let next = angle;
  while (next > 180) {
    next -= 360;
  }
  while (next < -180) {
    next += 360;
  }
  return next;
}

function buildTrackingCorners(centerX, centerY, widthRatio, heightRatio, rotation) {
  const angle = rotation * (Math.PI / 180);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfWidth = widthRatio / 2;
  const halfHeight = heightRatio / 2;
  const baseCorners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ];

  return baseCorners.map((corner) => ({
    x: clamp(centerX + (corner.x * cos) - (corner.y * sin), 0, 1),
    y: clamp(centerY + (corner.x * sin) + (corner.y * cos), 0, 1),
  }));
}

function summarizeGuidance(metrics) {
  if (!metrics.foundCard) {
    return {
      tone: "warning",
      headline: "Bring the card into the frame",
      detail: "Pass the face of the card over the camera until the white card body fills the guide box.",
    };
  }

  const xOffset = metrics.centerX - TARGET_BOX.centerX;
  const yOffset = metrics.centerY - TARGET_BOX.centerY;

  if (metrics.brightness < 90) {
    return {
      tone: "warning",
      headline: "Need more light",
      detail: "Move toward brighter table light or reduce shadows over the card.",
    };
  }

  if (metrics.brightness > 220) {
    return {
      tone: "warning",
      headline: "Too much glare",
      detail: "Tilt the phone or card slightly to avoid bright hotspots washing out the ink.",
    };
  }

  if (Math.abs(yOffset) > 0.08) {
    return {
      tone: "warning",
      headline: yOffset < 0 ? "Move the card lower" : "Move the card higher",
      detail: "Center the card vertically inside the guide box before the capture window starts.",
    };
  }

  if (Math.abs(xOffset) > 0.08) {
    return {
      tone: "warning",
      headline: xOffset < 0 ? "Move the card right" : "Move the card left",
      detail: "Keep the card centered over the camera corner so alignment stays repeatable.",
    };
  }

  if (metrics.areaRatio < TARGET_BOX.minArea) {
    return {
      tone: "warning",
      headline: "Move the card closer",
      detail: "The card should occupy more of the guide box so the signature is large enough to extract cleanly.",
    };
  }

  if (metrics.areaRatio > TARGET_BOX.maxArea) {
    return {
      tone: "warning",
      headline: "Move the card slightly higher",
      detail: "Back the card away from the lens a bit so the whole face fits inside the target zone.",
    };
  }

  if (metrics.aspectRatio < TARGET_BOX.minAspect || metrics.aspectRatio > TARGET_BOX.maxAspect) {
    return {
      tone: "warning",
      headline: "Hold the card flatter",
      detail: "Reduce tilt so the card shape matches a straight-on playing card.",
    };
  }

  if (metrics.motion > 18) {
    return {
      tone: "warning",
      headline: "Move the card slower",
      detail: "Your pass is fast enough to blur edges. Slow down slightly through the capture lane.",
    };
  }

  if (metrics.sharpness < 14) {
    return {
      tone: "warning",
      headline: "Hold steadier for focus",
      detail: "Pause slightly or smooth out the movement so the camera can lock detail on the signature.",
    };
  }

  return {
    tone: "good",
    headline: "Capture conditions look good",
    detail: "Lighting, framing, and motion are within the current target range for extraction.",
  };
}

function getGuideBoxStyle(foundCard, confidence) {
  if (!foundCard) {
    return {
      borderColor: "rgba(255, 214, 92, 0.9)",
      boxShadow: "0 0 0 1px rgba(255, 214, 92, 0.35)",
    };
  }

  if (confidence >= 0.8) {
    return {
      borderColor: "rgba(117, 255, 180, 0.95)",
      boxShadow: "0 0 0 1px rgba(117, 255, 180, 0.4), 0 0 28px rgba(117, 255, 180, 0.18)",
    };
  }

  return {
    borderColor: "rgba(255, 173, 66, 0.95)",
    boxShadow: "0 0 0 1px rgba(255, 173, 66, 0.4)",
  };
}

function buildCaptureReview(metrics) {
  if (!metrics.foundCard) {
    return {
      readiness: "not_ready",
      score: 0,
      summary: "Card not found clearly enough in the timed photo.",
      notes: [
        "Move the card fully into the capture lane before the timer ends.",
        "Keep the card face centered over the camera corner.",
      ],
    };
  }

  const notes = [];
  const xOffset = metrics.centerX - TARGET_BOX.centerX;
  const yOffset = metrics.centerY - TARGET_BOX.centerY;

  if (metrics.brightness < 90) {
    notes.push("Add more light or reduce the shadow over the card.");
  } else if (metrics.brightness > 220) {
    notes.push("Reduce glare by changing the card or phone angle slightly.");
  }

  if (Math.abs(yOffset) > 0.08) {
    notes.push(yOffset < 0 ? "Move the card lower in the frame." : "Move the card higher in the frame.");
  }

  if (Math.abs(xOffset) > 0.08) {
    notes.push(xOffset < 0 ? "Move the card slightly right." : "Move the card slightly left.");
  }

  if (metrics.areaRatio < TARGET_BOX.minArea) {
    notes.push("Bring the card closer to the camera.");
  } else if (metrics.areaRatio > TARGET_BOX.maxArea) {
    notes.push("Lift the card slightly farther from the camera.");
  }

  if (metrics.aspectRatio < TARGET_BOX.minAspect || metrics.aspectRatio > TARGET_BOX.maxAspect) {
    notes.push("Hold the card flatter to the phone.");
  }

  if (metrics.motion > 18) {
    notes.push("Move the card slower during the pass.");
  }

  if (metrics.sharpness < 14) {
    notes.push("Pause a fraction longer so the camera can hold focus.");
  }

  const readiness =
    metrics.confidence >= 0.82 ? "ready" : metrics.confidence >= 0.62 ? "borderline" : "not_ready";

  return {
    readiness,
    score: Math.round(metrics.confidence * 100),
    summary:
      readiness === "ready"
        ? "This timed shot looks usable for capture."
        : readiness === "borderline"
          ? "This shot is close, but you should tighten the handling before performance."
          : "This timed shot is not reliable enough yet.",
    notes: notes.length ? notes : ["No major corrections detected. Repeat a few times to confirm consistency."],
  };
}

export default function CalibrationScreen() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const streamRef = useRef(null);
  const previousFrameRef = useRef(null);
  const trackingLockRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState("Camera is off.");
  const [permissionError, setPermissionError] = useState("");
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [guidance, setGuidance] = useState(() => summarizeGuidance(DEFAULT_METRICS));
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [isSecureContextState, setIsSecureContextState] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [capturedPhoto, setCapturedPhoto] = useState("");
  const [captureReview, setCaptureReview] = useState(DEFAULT_CAPTURE_REVIEW);
  const [trackingLocked, setTrackingLocked] = useState(false);

  useEffect(() => {
    setSnapshot(getStoredCalibrationSnapshot());
    if (typeof window !== "undefined") {
      setIsSecureContextState(window.isSecureContext);
    }

    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    if (analysisTimerRef.current) {
      window.clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    previousFrameRef.current = null;
    trackingLockRef.current = null;
    setIsRunning(false);
    setCountdown(0);
    setTrackingLocked(false);
    setCameraStatus("Camera is off.");
  }

  async function startCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionError("Camera APIs are not available in this browser.");
      return;
    }

    try {
      setPermissionError("");
      setCameraStatus("Starting rear camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        return;
      }

      video.srcObject = stream;
      await video.play();

      setIsRunning(true);
      setCameraStatus("Rear camera is live. Move the card through the guide box.");
      analysisTimerRef.current = window.setInterval(analyzeFrame, 250);
    } catch (error) {
      setPermissionError(error instanceof Error ? error.message : "Unable to access the camera.");
      setCameraStatus("Camera failed to start.");
    }
  }

  function captureStillFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      setCameraStatus("Camera frame is not ready yet.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    context.save();
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, width, height);
    context.restore();

    const photo = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(photo);
    setCameraStatus("Timed capture complete.");
    setCaptureReview(buildCaptureReview(metrics));
  }

  function startTimedCapture() {
    if (!isRunning) {
      setCameraStatus("Start the rear camera first.");
      return;
    }

    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    let remaining = 4;
    setCountdown(remaining);
    setCameraStatus("Timed capture armed. Get the phone and card into position.");

    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(0);
        captureStillFrame();
        return;
      }

      setCountdown(remaining);
      setCameraStatus(`Capturing in ${remaining}...`);
    }, 1000);
  }

  function analyzeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      return;
    }

    const width = 320;
    const height = 240;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    const { data } = frame;

    let brightnessSum = 0;
    let sharpnessSum = 0;
    let brightCount = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumYY = 0;
    let sumXY = 0;

    const gray = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const luma = (0.299 * red) + (0.587 * green) + (0.114 * blue);
        gray[y * width + x] = luma;
        brightnessSum += luma;

        if (luma > 160 && red > 120 && green > 110 && blue > 100) {
          brightCount += 1;
          sumX += x;
          sumY += y;
          sumXX += x * x;
          sumYY += y * y;
          sumXY += x * y;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }

        if (x > 0 && y > 0) {
          const left = gray[(y * width) + (x - 1)];
          const up = gray[((y - 1) * width) + x];
          sharpnessSum += Math.abs(luma - left) + Math.abs(luma - up);
        }
      }
    }

    const totalPixels = width * height;
    const brightness = brightnessSum / totalPixels;
    const foundCard = brightCount > totalPixels * 0.04 && maxX > minX && maxY > minY;

    let areaRatio = 0;
    let aspectRatio = 0;
    let centerX = 0;
    let centerY = 0;
    let boxWidthRatio = 0;
    let boxHeightRatio = 0;
    let rotation = 0;
    let corners = [];

    if (foundCard) {
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      areaRatio = (boxWidth * boxHeight) / totalPixels;
      aspectRatio = boxWidth / Math.max(boxHeight, 1);
      centerX = ((minX + maxX) / 2) / width;
      centerY = ((minY + maxY) / 2) / height;
      boxWidthRatio = boxWidth / width;
      boxHeightRatio = boxHeight / height;

      const meanX = sumX / brightCount;
      const meanY = sumY / brightCount;
      const covXX = (sumXX / brightCount) - (meanX * meanX);
      const covYY = (sumYY / brightCount) - (meanY * meanY);
      const covXY = (sumXY / brightCount) - (meanX * meanY);
      rotation = normalizeDegrees((Math.atan2(2 * covXY, covXX - covYY) * 180) / Math.PI);
      corners = buildTrackingCorners(centerX, centerY, boxWidthRatio, boxHeightRatio, rotation);
    }

    let motion = 0;
    if (previousFrameRef.current) {
      const previous = previousFrameRef.current;
      let differenceSum = 0;
      for (let index = 0; index < gray.length; index += 8) {
        differenceSum += Math.abs(gray[index] - previous[index]);
      }
      motion = differenceSum / (gray.length / 8);
    }
    previousFrameRef.current = gray;

    const sharpness = sharpnessSum / totalPixels;
    const positionScore = foundCard
      ? 1 - clamp(
          (Math.abs(centerX - TARGET_BOX.centerX) + Math.abs(centerY - TARGET_BOX.centerY)) / 0.22,
          0,
          1
        )
      : 0;
    const areaScore = foundCard ? scoreBand(areaRatio, TARGET_BOX.minArea, TARGET_BOX.maxArea) : 0;
    const aspectScore = foundCard ? scoreBand(aspectRatio, TARGET_BOX.minAspect, TARGET_BOX.maxAspect) : 0;
    const brightnessScore = scoreBand(brightness, 95, 205);
    const sharpnessScore = scoreBand(sharpness, 14, 48);
    const motionScore = 1 - clamp(motion / 22, 0, 1);
    const confidence = clamp(
      (positionScore * 0.28)
      + (areaScore * 0.2)
      + (aspectScore * 0.16)
      + (brightnessScore * 0.14)
      + (sharpnessScore * 0.14)
      + (motionScore * 0.08),
      0,
      1
    );

    const nextMetrics = {
      brightness,
      sharpness,
      motion,
      areaRatio,
      aspectRatio,
      centerX,
      centerY,
      boxWidthRatio,
      boxHeightRatio,
      rotation,
      corners,
      confidence,
      foundCard,
    };

    setMetrics(nextMetrics);
    setGuidance(summarizeGuidance(nextMetrics));
  }

  function saveSnapshot() {
    const nextSnapshot = buildCalibrationSnapshot({
      savedAt: new Date().toISOString(),
      metrics: {
        brightness: Number(formatNumber(metrics.brightness)),
        sharpness: Number(formatNumber(metrics.sharpness)),
        motion: Number(formatNumber(metrics.motion)),
        areaRatio: Number(formatNumber(metrics.areaRatio)),
        aspectRatio: Number(formatNumber(metrics.aspectRatio)),
        centerX: Number(formatNumber(metrics.centerX)),
        centerY: Number(formatNumber(metrics.centerY)),
        boxWidthRatio: Number(formatNumber(metrics.boxWidthRatio)),
        boxHeightRatio: Number(formatNumber(metrics.boxHeightRatio)),
        rotation: Number(formatNumber(metrics.rotation)),
        confidence: Number(formatNumber(metrics.confidence * 100)),
      },
      tracking: trackingLocked && trackingLockRef.current
        ? {
            locked: true,
            reference: trackingLockRef.current,
          }
        : {
            locked: false,
      },
      guidance,
      capturedPhoto,
      captureReview,
    });
    setStoredCalibrationSnapshot(nextSnapshot);
    setSnapshot(nextSnapshot);
  }

  const guideBoxStyle = getGuideBoxStyle(metrics.foundCard, metrics.confidence);
  const trackingState = !metrics.foundCard
    ? "searching"
    : trackingLocked
      ? "locked"
      : metrics.confidence >= 0.78
        ? "tracking"
        : "acquiring";
  const trackingTone = trackingState === "locked" || trackingState === "tracking" ? "good" : "warn";
  const lockedScaleDelta = trackingLocked && trackingLockRef.current?.areaRatio
    ? Math.sqrt(metrics.areaRatio / Math.max(trackingLockRef.current.areaRatio, 0.0001))
    : 1;
  const lockedRotationDelta = trackingLocked && trackingLockRef.current
    ? normalizeDegrees(metrics.rotation - trackingLockRef.current.rotation)
    : 0;
  const trackingPolygon = metrics.corners.map((corner) => `${corner.x * 1000},${corner.y * 1000}`).join(" ");

  function toggleTrackingLock() {
    if (trackingLocked) {
      trackingLockRef.current = null;
      setTrackingLocked(false);
      setCameraStatus("Tracking unlocked. Live card transform is still visible.");
      return;
    }

    if (!metrics.foundCard) {
      setCameraStatus("Bring the card fully into frame before locking tracking.");
      return;
    }

    trackingLockRef.current = {
      centerX: metrics.centerX,
      centerY: metrics.centerY,
      areaRatio: metrics.areaRatio,
      rotation: metrics.rotation,
      confidence: metrics.confidence,
    };
    setTrackingLocked(true);
    setCameraStatus("Tracking locked to the current card transform.");
  }

  return (
    <div className="calibrationShell">
      <div className="calibrationPanel">
        <div className="heroPanel">
          <div className="eyebrow">InkSync Calibration</div>
          <h1>Dial in the capture lane before you perform.</h1>
          <p className="lede">
            Use the phone you will perform with, the same table, and the same lighting. Pass the signed 5 of diamonds through the camera lane until the guidance turns stable.
          </p>
          <div className="buttonRow">
            <button type="button" className="action-button" onClick={isRunning ? stopCamera : startCamera}>
              {isRunning ? "Stop Camera" : "Start Rear Camera"}
            </button>
            <button type="button" className="action-button" onClick={startTimedCapture} disabled={!isRunning || countdown > 0}>
              {countdown > 0 ? `Photo in ${countdown}` : "Take Photo In 4 Seconds"}
            </button>
            <button type="button" className="ghost-button" onClick={saveSnapshot} disabled={!metrics.foundCard}>
              Save Calibration Snapshot
            </button>
          </div>
          <p className="helper-copy">{cameraStatus}</p>
          {permissionError ? <div className="feedback-banner error">{permissionError}</div> : null}
          {!isSecureContextState ? (
            <div className="feedback-banner error">
              Camera access on mobile needs HTTPS or localhost. Use the HTTPS dev script on the phone.
            </div>
          ) : null}
        </div>

        <div className="content-grid detail-grid">
          <section className="panel elevated-panel">
            <div className="panel-header align-start">
              <div>
                <div className="section-kicker">Live camera</div>
                <h2>Capture lane</h2>
              </div>
            </div>

            <div className="videoFrame">
              <video ref={videoRef} className="videoFeed" playsInline muted />
              {metrics.foundCard ? (
                <svg className="trackingOverlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                  <polygon
                    points={trackingPolygon}
                    className={`trackingPolygon trackingPolygon${trackingTone === "good" ? "Good" : "Warn"}`}
                  />
                  {metrics.corners.map((corner, index) => (
                    <circle
                      key={`tracking-corner-${index + 1}`}
                      cx={corner.x * 1000}
                      cy={corner.y * 1000}
                      r="9"
                      className="trackingCorner"
                    />
                  ))}
                </svg>
              ) : null}
              <div className="guideBox" style={guideBoxStyle} aria-hidden="true" />
              <div className="guideCenter" aria-hidden="true" />
            </div>
            <canvas ref={canvasRef} className="hiddenCanvas" />
            <div className="trackingToolbar">
              <div className={`confidencePill confidencePill${trackingTone === "good" ? "Good" : "Warn"}`}>
                {trackingState}
              </div>
              <button type="button" className="ghost-button" onClick={toggleTrackingLock} disabled={!metrics.foundCard && !trackingLocked}>
                {trackingLocked ? "Unlock Tracking" : "Lock Tracking"}
              </button>
            </div>
          </section>

          <section className="panel elevated-panel">
            <div className="panel-header align-start">
              <div>
                <div className="section-kicker">Guidance</div>
                <h2>{guidance.headline}</h2>
              </div>
              <div className={`confidencePill confidencePill${guidance.tone === "good" ? "Good" : "Warn"}`}>
                {formatPercent(metrics.confidence)}
              </div>
            </div>
            <p className="lede compactLede">{guidance.detail}</p>

            <div className="statsGrid">
              <div className="statCard">
                <span className="statLabel">Brightness</span>
                <strong>{formatNumber(metrics.brightness)}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Sharpness</span>
                <strong>{formatNumber(metrics.sharpness)}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Motion</span>
                <strong>{formatNumber(metrics.motion)}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Card Size</span>
                <strong>{formatPercent(metrics.areaRatio)}</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Rotation</span>
                <strong>{formatNumber(metrics.rotation)} deg</strong>
              </div>
              <div className="statCard">
                <span className="statLabel">Scale</span>
                <strong>{trackingLocked ? `${formatNumber(lockedScaleDelta)}x` : "Live"}</strong>
              </div>
            </div>

            <div className="list-stack dense">
              <div className="muted-panel">
                <strong>Live checks</strong>
                <p className="helper-copy">
                  Center X/Y: {formatNumber(metrics.centerX)} / {formatNumber(metrics.centerY)}. Aspect ratio: {formatNumber(metrics.aspectRatio)}.
                </p>
                <p className="helper-copy">
                  Box W/H: {formatPercent(metrics.boxWidthRatio)} / {formatPercent(metrics.boxHeightRatio)}. Rotation delta: {trackingLocked ? `${formatNumber(lockedRotationDelta)} deg` : "lock tracking to compare"}.
                </p>
              </div>
              <div className="muted-panel">
                <strong>Ideal pass</strong>
                <p className="helper-copy">
                  Keep the card centered in the guide box, almost parallel to the phone, and slow enough that the edges stay crisp.
                </p>
              </div>
              <div className="muted-panel">
                <strong>Tracking engine</strong>
                <p className="helper-copy">
                  {trackingLocked
                    ? "Tracking is locked to the current card transform. Move the card to judge live rotation and scale drift."
                    : "Tracking is live. Lock it once the card is centered to compare transform changes during motion."}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header align-start">
            <div>
              <div className="section-kicker">Saved result</div>
              <h2>Last calibration snapshot</h2>
            </div>
          </div>
          {snapshot ? (
            <div className="report-card">
              <p className="helper-copy">Saved at {new Date(snapshot.savedAt).toLocaleString()}.</p>
              <p className="helper-copy">
                Confidence {snapshot.metrics.confidence}%, brightness {snapshot.metrics.brightness}, sharpness {snapshot.metrics.sharpness}, motion {snapshot.metrics.motion}.
              </p>
              <p className="helper-copy">
                Guidance at save time: {snapshot.guidance.headline}. {snapshot.guidance.detail}
              </p>
            </div>
          ) : (
            <div className="muted-panel">
              <p className="helper-copy">
                No calibration snapshot saved yet. Start the camera, tune the card pass until the confidence stabilizes, then save a reference.
              </p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header align-start">
            <div>
              <div className="section-kicker">Timed photo</div>
              <h2>Latest captured frame</h2>
            </div>
          </div>
          {capturedPhoto ? (
            <div className="list-stack">
              <div className="capturePreviewWrap">
                <img src={capturedPhoto} alt="Latest calibration capture" className="capturePreview" />
              </div>
              <div className={`reviewCard reviewCard${captureReview.readiness === "ready" ? "Ready" : captureReview.readiness === "borderline" ? "Borderline" : "NotReady"}`}>
                <div className="reviewHeader">
                  <strong>{captureReview.summary}</strong>
                  <span className="reviewScore">{captureReview.score}%</span>
                </div>
                <div className="helper-copy">Post-shot verdict: {captureReview.readiness.replace("_", " ")}</div>
                <ul className="reviewList">
                  {captureReview.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="muted-panel">
              <p className="helper-copy">
                Use the 4-second timer, set the phone face down in performance position, then move the card into the capture lane before the shutter fires.
              </p>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .calibrationShell {
          min-height: 100vh;
          padding: 28px 18px 64px;
        }

        .calibrationPanel {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          gap: 20px;
        }

        .compactLede {
          margin-bottom: 18px;
        }

        .videoFrame {
          position: relative;
          overflow: hidden;
          min-height: 420px;
          border-radius: 22px;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 32%),
            linear-gradient(180deg, #22160f 0%, #0b0907 100%);
          border: 1px solid rgba(61, 40, 23, 0.14);
        }

        .videoFeed {
          width: 100%;
          height: min(72vh, 780px);
          min-height: 420px;
          display: block;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .guideBox {
          position: absolute;
          left: 50%;
          top: 54%;
          width: min(44vw, 250px);
          aspect-ratio: 0.76 / 1;
          transform: translate(-50%, -50%);
          border-radius: 22px;
          border: 3px solid rgba(255, 214, 92, 0.9);
          background: rgba(255, 255, 255, 0.03);
          transition: border-color 140ms ease, box-shadow 140ms ease;
          pointer-events: none;
        }

        .guideCenter {
          position: absolute;
          left: 50%;
          top: 54%;
          width: 12px;
          height: 12px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        .hiddenCanvas {
          display: none;
        }

        .trackingOverlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          transform: scaleX(-1);
        }

        .trackingPolygon {
          fill: rgba(117, 255, 180, 0.1);
          stroke-width: 4px;
          vector-effect: non-scaling-stroke;
          stroke-linejoin: round;
        }

        .trackingPolygonGood {
          stroke: rgba(117, 255, 180, 0.95);
          fill: rgba(117, 255, 180, 0.1);
        }

        .trackingPolygonWarn {
          stroke: rgba(255, 173, 66, 0.95);
          fill: rgba(255, 173, 66, 0.08);
        }

        .trackingCorner {
          fill: rgba(255, 255, 255, 0.98);
          stroke: rgba(12, 17, 26, 0.7);
          stroke-width: 2px;
          vector-effect: non-scaling-stroke;
        }

        .trackingToolbar {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .capturePreviewWrap {
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(61, 40, 23, 0.14);
          background: #120c08;
        }

        .capturePreview {
          display: block;
          width: 100%;
          max-height: 560px;
          object-fit: contain;
        }

        .reviewCard {
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid var(--line);
        }

        .reviewCardReady {
          background: var(--success-bg);
          color: var(--success-text);
        }

        .reviewCardBorderline {
          background: #fff3de;
          color: #8a4f00;
        }

        .reviewCardNotReady {
          background: var(--error-bg);
          color: var(--error-text);
        }

        .reviewHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .reviewScore {
          font-weight: 700;
        }

        .reviewList {
          margin: 10px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
        }

        .confidencePill {
          min-width: 84px;
          padding: 10px 14px;
          border-radius: 999px;
          text-align: center;
          font-weight: 700;
        }

        .confidencePillGood {
          background: #e9f6ea;
          color: #235f28;
        }

        .confidencePillWarn {
          background: #fdebd8;
          color: #9a4f08;
        }

        @media (max-width: 720px) {
          .calibrationShell {
            padding: 18px 14px 44px;
          }

          .videoFeed,
          .videoFrame {
            min-height: 360px;
            height: 60vh;
          }

          .guideBox {
            width: min(56vw, 230px);
          }
        }
      `}</style>
    </div>
  );
}
