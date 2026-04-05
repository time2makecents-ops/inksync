"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ZERO_MOTION = { x: "0.00", y: "0.00", z: "0.00" };
const ZERO_ORIENTATION = { alpha: "0.00", beta: "0.00", gamma: "0.00" };
const DEFAULT_SUPPORT = {
  secureContext: false,
  origin: "loading",
  motionAvailable: false,
  orientationAvailable: false,
  motionPermissionRequired: false,
  orientationPermissionRequired: false,
};
const FILTER_ALPHA = 0.88;
const DISPLAY_ALPHA = 0.72;
const SAMPLE_TARGETS = ["forward", "left", "right"];
const SAMPLE_LEVELS = ["light", "controlled", "hard"];
const PLACEMENT_OPTIONS = ["horizontal", "vertical"];

function formatValue(value) {
  return Number(value ?? 0).toFixed(2);
}

function smoothAxis(previous, next) {
  return DISPLAY_ALPHA * previous + (1 - DISPLAY_ALPHA) * next;
}

function sampleLabel(target, level) {
  return `${target} ${level}`;
}

function sampleKey(target, level) {
  return `${target}:${level}`;
}

function emptyPeaks() {
  return { x: 0, y: 0, z: 0 };
}

function formatPeaks(peaks) {
  return {
    x: formatValue(peaks.x),
    y: formatValue(peaks.y),
    z: formatValue(peaks.z),
  };
}
function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) {
    return 0;
  }

  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function getAxisMap(placement) {
  return placement === "horizontal"
    ? { forward: "x", lateral: "y" }
    : { forward: "y", lateral: "x" };
}

function getVerticalAxis(placement) {
  return placement === "horizontal" ? "z" : "z";
}

function getStrengthForTarget(take, target, placement) {
  if (target === "forward") {
    return Number(take.expectedPeak);
  }

  const axisMap = getAxisMap(placement);
  const verticalAxis = getVerticalAxis(placement);
  const lateral = Number(take[axisMap.lateral] ?? 0);
  const vertical = Number(take[verticalAxis] ?? 0);
  return Math.sqrt(lateral ** 2 + vertical ** 2);
}

function summarizeTakes(takesByKey, placement) {
  const summary = {};

  for (const [key, takes] of Object.entries(takesByKey)) {
    if (!takes.length) {
      continue;
    }

    const [target] = key.split(":");
    const strengths = takes.map((take) => getStrengthForTarget(take, target, placement));
    summary[key] = {
      count: takes.length,
      avg: formatValue(mean(strengths)),
      std: formatValue(stdDev(strengths)),
      min: formatValue(Math.min(...strengths)),
      max: formatValue(Math.max(...strengths)),
      metric: target === "forward" ? "forward-axis peak" : "combined lateral+vertical",
    };
  }

  return summary;
}

function deriveThresholdBand(statMap, prefix) {
  const light = statMap[`${prefix}:light`];
  const controlled = statMap[`${prefix}:controlled`];
  const hard = statMap[`${prefix}:hard`];

  if (!light || !controlled || !hard) {
    return null;
  }

  const lightAvg = Number(light.avg);
  const controlledAvg = Number(controlled.avg);
  const hardAvg = Number(hard.avg);

  return {
    settledMax: formatValue(Math.max(0.15, lightAvg * 0.5)),
    lightMax: formatValue((lightAvg + controlledAvg) / 2),
    controlledMax: formatValue((controlledAvg + hardAvg) / 2),
    hardMin: formatValue((controlledAvg + hardAvg) / 2),
    lightAvg: formatValue(lightAvg),
    controlledAvg: formatValue(controlledAvg),
    hardAvg: formatValue(hardAvg),
  };
}

function deriveLateralThresholds(statMap) {
  const left = deriveThresholdBand(statMap, "left");
  const right = deriveThresholdBand(statMap, "right");
  if (!left && !right) {
    return null;
  }

  const sources = [left, right].filter(Boolean);
  const fields = ["settledMax", "lightMax", "controlledMax", "hardMin", "lightAvg", "controlledAvg", "hardAvg"];
  const result = {};

  for (const field of fields) {
    result[field] = formatValue(mean(sources.map((source) => Number(source[field]))));
  }

  return result;
}

export default function AccelerometerTest() {
  const motionHandlerRef = useRef(null);
  const orientationHandlerRef = useRef(null);
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedRawRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedFilteredRef = useRef({ x: 0, y: 0, z: 0 });
  const peakResetRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingRef = useRef(null);
  const rawRecordingPeakRef = useRef(emptyPeaks());
  const calibratedRecordingPeakRef = useRef(emptyPeaks());

  const [status, setStatus] = useState("idle");
  const [placement, setPlacement] = useState("horizontal");
  const [activeSensor, setActiveSensor] = useState("none");
  const [permissionStatus, setPermissionStatus] = useState("not requested");
  const [motion, setMotion] = useState(ZERO_MOTION);
  const [filteredMotion, setFilteredMotion] = useState(ZERO_MOTION);
  const [calibratedMotion, setCalibratedMotion] = useState(ZERO_MOTION);
  const [motionPeak, setMotionPeak] = useState(ZERO_MOTION);
  const [motionSource, setMotionSource] = useState("none");
  const [orientation, setOrientation] = useState(ZERO_ORIENTATION);
  const [support, setSupport] = useState(DEFAULT_SUPPORT);
  const [recording, setRecording] = useState(null);
  const [rawTakes, setRawTakes] = useState({});
  const [calibratedTakes, setCalibratedTakes] = useState({});
  const [baseline, setBaseline] = useState({ x: 0, y: 0, z: 0 });
  const [baselineSet, setBaselineSet] = useState(false);
  const [logStatus, setLogStatus] = useState("not saved");

  const axisMap = useMemo(() => getAxisMap(placement), [placement]);
  const verticalAxis = useMemo(() => getVerticalAxis(placement), [placement]);
  const rawStats = useMemo(() => summarizeTakes(rawTakes, placement), [rawTakes, placement]);
  const calibratedStats = useMemo(() => summarizeTakes(calibratedTakes, placement), [calibratedTakes, placement]);
  const derivedThresholds = useMemo(
    () => ({
      forward: deriveThresholdBand(calibratedStats, "forward"),
      left: deriveThresholdBand(calibratedStats, "left"),
      right: deriveThresholdBand(calibratedStats, "right"),
      lateral: deriveLateralThresholds(calibratedStats),
    }),
    [calibratedStats]
  );
  const currentSnapshot = useMemo(
    () => ({
      x: Number(filteredMotion.x),
      y: Number(filteredMotion.y),
      z: Number(filteredMotion.z),
    }),
    [filteredMotion]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const motionCtor = window.DeviceMotionEvent;
    const orientationCtor = window.DeviceOrientationEvent;

    setSupport({
      secureContext: window.isSecureContext,
      origin: window.location.href,
      motionAvailable: typeof motionCtor !== "undefined" || "ondevicemotion" in window,
      orientationAvailable:
        typeof orientationCtor !== "undefined" || "ondeviceorientation" in window,
      motionPermissionRequired: typeof motionCtor?.requestPermission === "function",
      orientationPermissionRequired: typeof orientationCtor?.requestPermission === "function",
    });

    return () => {
      if (motionHandlerRef.current) {
        window.removeEventListener("devicemotion", motionHandlerRef.current);
      }
      if (orientationHandlerRef.current) {
        window.removeEventListener("deviceorientation", orientationHandlerRef.current);
      }
      if (peakResetRef.current) {
        window.clearTimeout(peakResetRef.current);
      }
      if (recordingTimerRef.current) {
        window.clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  async function requestPermissionIfNeeded(sensorType) {
    if (typeof window === "undefined") {
      return "unavailable";
    }

    const ctor = sensorType === "motion" ? window.DeviceMotionEvent : window.DeviceOrientationEvent;
    if (typeof ctor?.requestPermission !== "function") {
      return "not required";
    }

    setPermissionStatus(`requesting ${sensorType}`);
    const result = await ctor.requestPermission();
    setPermissionStatus(result);
    return result;
  }

  function setCalibrationBaseline() {
    setBaseline({
      x: currentSnapshot.x,
      y: currentSnapshot.y,
      z: currentSnapshot.z,
    });
    setBaselineSet(true);
    setStatus(`Calibration baseline captured for ${placement} placement.`);
  }

  function finishRecording(target, level, mode) {
    const peaks = mode === "calibrated" ? calibratedRecordingPeakRef.current : rawRecordingPeakRef.current;
    const expectedAxis = target === "forward" ? axisMap.forward : axisMap.lateral;
    const strengthScore =
      target === "forward"
        ? Math.abs(peaks[expectedAxis])
        : Math.sqrt((peaks[axisMap.lateral] ?? 0) ** 2 + (peaks[verticalAxis] ?? 0) ** 2);
    const entry = {
      target,
      level,
      expectedAxis: expectedAxis.toUpperCase(),
      expectedPeak: formatValue(peaks[expectedAxis]),
      strengthScore: formatValue(strengthScore),
      dominantAxis:
        Math.abs(peaks.x) >= Math.abs(peaks.y) && Math.abs(peaks.x) >= Math.abs(peaks.z)
          ? "X"
          : Math.abs(peaks.y) >= Math.abs(peaks.z)
            ? "Y"
            : "Z",
      ...formatPeaks(peaks),
      placement,
      recordedAt: new Date().toISOString(),
    };

    const key = sampleKey(target, level);
    if (mode === "calibrated") {
      setCalibratedTakes((current) => ({
        ...current,
        [key]: [...(current[key] ?? []), entry],
      }));
    } else {
      setRawTakes((current) => ({
        ...current,
        [key]: [...(current[key] ?? []), entry],
      }));
    }

    recordingRef.current = null;
    setRecording(null);
    setStatus(`Recorded ${mode} ${sampleLabel(target, level)} take.`);
  }

  function startRecording(target, level, mode) {
    if (!motionHandlerRef.current) {
      setStatus("Enable sensors first.");
      return;
    }

    if (mode === "calibrated" && !baselineSet) {
      setStatus("Tap Calibrate first so calibrated recording has a baseline.");
      return;
    }

    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
    }

    rawRecordingPeakRef.current = emptyPeaks();
    calibratedRecordingPeakRef.current = emptyPeaks();
    const nextRecording = { target, level, mode };
    recordingRef.current = nextRecording;
    setRecording(nextRecording);
    setStatus(`Record ${mode} ${sampleLabel(target, level)} now.`);

    recordingTimerRef.current = window.setTimeout(() => {
      finishRecording(target, level, mode);
    }, 2200);
  }

  function removeLastTake(target, level, mode) {
    const key = sampleKey(target, level);
    const update = (current) => {
      const takes = current[key] ?? [];
      if (!takes.length) {
        return current;
      }

      return {
        ...current,
        [key]: takes.slice(0, -1),
      };
    };

    if (mode === "calibrated") {
      setCalibratedTakes(update);
    } else {
      setRawTakes(update);
    }

    setStatus(`Removed latest ${mode} ${sampleLabel(target, level)} take.`);
  }

  async function saveLogToFile() {
    try {
      setLogStatus("saving");
      const response = await fetch("/api/accelerometer-calibration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recordedAt: new Date().toISOString(),
          origin: support.origin,
          placement,
          axisMap,
          motionSource,
          baseline: {
            x: formatValue(baseline.x),
            y: formatValue(baseline.y),
            z: formatValue(baseline.z),
          },
          rawTakes,
          calibratedTakes,
          rawStats,
          calibratedStats,
          derivedThresholds,
        }),
      });

      if (!response.ok) {
        throw new Error(`save failed: ${response.status}`);
      }

      const payload = await response.json();
      setLogStatus(`saved to ${payload.path}`);
    } catch (error) {
      setLogStatus(error instanceof Error ? error.message : "save failed");
    }
  }

  function attachMotionListener() {
    if (typeof window === "undefined" || motionHandlerRef.current) {
      return false;
    }

    const handleMotion = (event) => {
      const rawAcc = event.accelerationIncludingGravity || event.acceleration || {};
      const linearAcc = event.acceleration;
      const rawX = Number(rawAcc.x ?? 0);
      const rawY = Number(rawAcc.y ?? 0);
      const rawZ = Number(rawAcc.z ?? 0);

      smoothedRawRef.current = {
        x: smoothAxis(smoothedRawRef.current.x, rawX),
        y: smoothAxis(smoothedRawRef.current.y, rawY),
        z: smoothAxis(smoothedRawRef.current.z, rawZ),
      };

      setMotion({
        x: formatValue(smoothedRawRef.current.x),
        y: formatValue(smoothedRawRef.current.y),
        z: formatValue(smoothedRawRef.current.z),
      });

      let filteredX = 0;
      let filteredY = 0;
      let filteredZ = 0;

      if (
        linearAcc &&
        typeof linearAcc.x === "number" &&
        typeof linearAcc.y === "number" &&
        typeof linearAcc.z === "number"
      ) {
        filteredX = Number(linearAcc.x ?? 0);
        filteredY = Number(linearAcc.y ?? 0);
        filteredZ = Number(linearAcc.z ?? 0);
        setMotionSource("linear acceleration");
      } else {
        gravityRef.current = {
          x: FILTER_ALPHA * gravityRef.current.x + (1 - FILTER_ALPHA) * rawX,
          y: FILTER_ALPHA * gravityRef.current.y + (1 - FILTER_ALPHA) * rawY,
          z: FILTER_ALPHA * gravityRef.current.z + (1 - FILTER_ALPHA) * rawZ,
        };

        filteredX = rawX - gravityRef.current.x;
        filteredY = rawY - gravityRef.current.y;
        filteredZ = rawZ - gravityRef.current.z;
        setMotionSource("gravity filtered");
      }

      smoothedFilteredRef.current = {
        x: smoothAxis(smoothedFilteredRef.current.x, filteredX),
        y: smoothAxis(smoothedFilteredRef.current.y, filteredY),
        z: smoothAxis(smoothedFilteredRef.current.z, filteredZ),
      };

      const filtered = {
        x: smoothedFilteredRef.current.x,
        y: smoothedFilteredRef.current.y,
        z: smoothedFilteredRef.current.z,
      };
      const calibrated = {
        x: filtered.x - baseline.x,
        y: filtered.y - baseline.y,
        z: filtered.z - baseline.z,
      };

      setFilteredMotion(formatPeaks(filtered));
      setCalibratedMotion(formatPeaks(calibrated));

      setMotionPeak((current) => ({
        x: formatValue(Math.max(Math.abs(Number(current.x)), Math.abs(filtered.x))),
        y: formatValue(Math.max(Math.abs(Number(current.y)), Math.abs(filtered.y))),
        z: formatValue(Math.max(Math.abs(Number(current.z)), Math.abs(filtered.z))),
      }));

      if (recordingRef.current) {
        rawRecordingPeakRef.current = {
          x: Math.max(rawRecordingPeakRef.current.x, Math.abs(filtered.x)),
          y: Math.max(rawRecordingPeakRef.current.y, Math.abs(filtered.y)),
          z: Math.max(rawRecordingPeakRef.current.z, Math.abs(filtered.z)),
        };
        calibratedRecordingPeakRef.current = {
          x: Math.max(calibratedRecordingPeakRef.current.x, Math.abs(calibrated.x)),
          y: Math.max(calibratedRecordingPeakRef.current.y, Math.abs(calibrated.y)),
          z: Math.max(calibratedRecordingPeakRef.current.z, Math.abs(calibrated.z)),
        };
      }

      if (peakResetRef.current) {
        window.clearTimeout(peakResetRef.current);
      }
      peakResetRef.current = window.setTimeout(() => {
        setMotionPeak(ZERO_MOTION);
      }, 900);

      setActiveSensor("devicemotion");
      setStatus((current) => (recordingRef.current ? current : "receiving motion"));
    };

    motionHandlerRef.current = handleMotion;
    window.addEventListener("devicemotion", handleMotion);
    setActiveSensor("devicemotion");
    setStatus("motion listener attached");
    return true;
  }

  function attachOrientationListener() {
    if (typeof window === "undefined" || orientationHandlerRef.current) {
      return false;
    }

    const handleOrientation = (event) => {
      setOrientation({
        alpha: formatValue(event.alpha),
        beta: formatValue(event.beta),
        gamma: formatValue(event.gamma),
      });
    };

    orientationHandlerRef.current = handleOrientation;
    window.addEventListener("deviceorientation", handleOrientation);
    return true;
  }

  async function enableSensors() {
    try {
      setStatus("button tapped");

      if (typeof window === "undefined") {
        setStatus("no window");
        return;
      }

      if (!window.isSecureContext) {
        setActiveSensor("none");
        setPermissionStatus("blocked by insecure context");
        setStatus("motion sensors require https or localhost");
        return;
      }

      if (support.motionAvailable) {
        const motionPermission = await requestPermissionIfNeeded("motion");
        if (motionPermission !== "denied") {
          attachMotionListener();
        } else {
          setStatus("motion permission denied");
        }
      }

      if (support.orientationAvailable) {
        const orientationPermission = await requestPermissionIfNeeded("orientation");
        if (orientationPermission !== "denied") {
          attachOrientationListener();
        }
      }
    } catch (err) {
      setPermissionStatus("error");
      setStatus(`error: ${err?.message || "unknown error"}`);
    }
  }

  const browserSupportStatus =
    support.motionAvailable || support.orientationAvailable ? "supported" : "unsupported";
  const permissionRequired =
    support.motionPermissionRequired || support.orientationPermissionRequired ? "yes" : "no";
  const environmentStatus = support.secureContext ? "secure" : "insecure";

  function renderRecorder(title, mode, takeMap, statMap) {
    return (
      <div style={{ border: "1px solid #ccc", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ margin: 0 }}>
          Record multiple takes per slot. New takes are added to the slot, then averaged for thresholds.
        </p>
        {recording?.mode === mode ? (
          <p style={{ margin: 0, fontWeight: 700 }}>Recording: {sampleLabel(recording.target, recording.level)}</p>
        ) : null}
        {SAMPLE_TARGETS.map((target) => (
          <div key={`${mode}:${target}`} style={{ display: "grid", gap: 6 }}>
            <strong style={{ textTransform: "capitalize" }}>{target}</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SAMPLE_LEVELS.map((level) => {
                const key = sampleKey(target, level);
                const takes = takeMap[key] ?? [];

                return (
                  <div key={`${mode}:${target}:${level}`} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button onClick={() => startRecording(target, level, mode)} disabled={!!recording}>
                      Record {level}
                    </button>
                    <button onClick={() => removeLastTake(target, level, mode)} disabled={!takes.length || !!recording}>
                      Delete last
                    </button>
                  </div>
                );
              })}
            </div>
            {SAMPLE_LEVELS.map((level) => {
              const key = sampleKey(target, level);
              const takes = takeMap[key] ?? [];
              const stats = statMap[key];
              if (!takes.length) {
                return null;
              }

              return (
                <div key={`${mode}:${key}:summary`} style={{ fontSize: 14 }}>
                  <p style={{ margin: 0 }}>
                    {level}: {takes.length} take(s), avg {stats?.avg}, std {stats?.std}, min {stats?.min}, max {stats?.max}
                  </p>
                  <p style={{ margin: 0 }}>
                    metric: {stats?.metric}. latest score {takes[takes.length - 1].strengthScore}
                  </p>
                  <p style={{ margin: 0 }}>
                    latest: expected axis {takes[takes.length - 1].expectedAxis}, peak {takes[takes.length - 1].expectedPeak}, dominant {takes[takes.length - 1].dominantAxis}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Accelerometer Test</h1>
      <div style={{ border: "1px solid #ccc", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Setup</h2>
        <p style={{ margin: 0 }}>Choose how the phone sits on the machine so the page can map forward and lateral axes correctly.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLACEMENT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setPlacement(option)}
              style={{ fontWeight: placement === option ? 700 : 400, borderWidth: placement === option ? 2 : 1 }}
            >
              {option}
            </button>
          ))}
        </div>
        <p style={{ margin: 0 }}>Placement: {placement}. Forward axis: {axisMap.forward.toUpperCase()}. Lateral axis: {axisMap.lateral.toUpperCase()}. Vertical axis: {verticalAxis.toUpperCase()}.</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={enableSensors} style={{ width: "fit-content" }}>
          Enable Sensors
        </button>
        <button onClick={setCalibrationBaseline} style={{ width: "fit-content" }}>
          Calibrate
        </button>
        <button onClick={saveLogToFile} style={{ width: "fit-content" }}>
          Save Log To File
        </button>
      </div>

      <div>
        <p>Status: {status}</p>
        <p>Active sensor: {activeSensor}</p>
        <p>Permission required: {permissionRequired}</p>
        <p>Browser support status: {browserSupportStatus}</p>
        <p>Context security: {environmentStatus}</p>
        <p>Baseline set: {baselineSet ? `X ${formatValue(baseline.x)} Y ${formatValue(baseline.y)} Z ${formatValue(baseline.z)}` : "no"}</p>
        <p>Log status: {logStatus}</p>
      </div>

      {renderRecorder("Reference Recorder", "raw", rawTakes, rawStats)}
      {renderRecorder("Reference Recorder (Calibrated)", "calibrated", calibratedTakes, calibratedStats)}
      <div style={{ border: "1px solid #ccc", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Derived Thresholds</h2>
        <p style={{ margin: 0 }}>These thresholds are built from averaged calibrated samples only.</p>
        <p style={{ margin: 0 }}>Forward: {derivedThresholds.forward ? JSON.stringify(derivedThresholds.forward) : "not enough takes"}</p>
        <p style={{ margin: 0 }}>Left: {derivedThresholds.left ? JSON.stringify(derivedThresholds.left) : "not enough takes"}</p>
        <p style={{ margin: 0 }}>Right: {derivedThresholds.right ? JSON.stringify(derivedThresholds.right) : "not enough takes"}</p>
        <p style={{ margin: 0 }}>Lateral for Tilt Lab: {derivedThresholds.lateral ? JSON.stringify(derivedThresholds.lateral) : "not enough takes"}</p>
      </div>

      {!support.secureContext ? (
        <div style={{ border: "1px solid #d4b106", borderRadius: 12, padding: 16, background: "#fff8db" }}>
          <h2 style={{ marginTop: 0 }}>Why Sensors Look Unsupported</h2>
          <p style={{ marginBottom: 8 }}>
            This page is running in an insecure context, so mobile browsers may hide motion and orientation APIs completely.
          </p>
          <p style={{ margin: 0 }}>
            Open the page with HTTPS or directly on <code>localhost</code> on the device.
          </p>
        </div>
      ) : null}

      <div>
        <h2 style={{ marginBottom: 8 }}>Raw Motion</h2>
        <p>X: {motion.x}</p>
        <p>Y: {motion.y}</p>
        <p>Z: {motion.z}</p>
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Nudge Motion</h2>
        <p>Source: {motionSource}</p>
        <p>X: {filteredMotion.x}</p>
        <p>Y: {filteredMotion.y}</p>
        <p>Z: {filteredMotion.z}</p>
        <p>Peak X/Y/Z: {motionPeak.x} / {motionPeak.y} / {motionPeak.z}</p>
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Calibrated Motion</h2>
        <p>X: {calibratedMotion.x}</p>
        <p>Y: {calibratedMotion.y}</p>
        <p>Z: {calibratedMotion.z}</p>
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Orientation</h2>
        <p>Alpha: {orientation.alpha}</p>
        <p>Beta: {orientation.beta}</p>
        <p>Gamma: {orientation.gamma}</p>
      </div>

      <div style={{ border: "1px solid #ccc", borderRadius: 12, padding: 16, background: "#f8f8f8" }}>
        <h2 style={{ marginTop: 0 }}>Debug</h2>
        <p>Page URL: {support.origin}</p>
        <p>Secure context: {String(support.secureContext)}</p>
        <p>DeviceMotionEvent available: {String(support.motionAvailable)}</p>
        <p>DeviceOrientationEvent available: {String(support.orientationAvailable)}</p>
        <p>Permission status: {permissionStatus}</p>
        <p>Active sensor: {activeSensor}</p>
        <p>Permission required: {permissionRequired}</p>
        <p>Browser support status: {browserSupportStatus}</p>
      </div>
    </div>
  );
}












