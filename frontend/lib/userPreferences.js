export const HANDEDNESS_STORAGE_KEY = "flipperiq-handedness";
export const HANDEDNESS_OPTIONS = ["right", "left"];
export const PROFILE_PHOTO_STORAGE_KEY = "flipperiq-profile-photo";
export const CALIBRATION_SNAPSHOT_STORAGE_KEY = "inksync-calibration-snapshot";
export const OVERLAY_CALIBRATION_STORAGE_KEY = "inksync-overlay-calibration";
export const SIGNATURE_REVEAL_CALIBRATION_STORAGE_KEY = "inksync-signature-reveal-calibration";
export const CALIBRATION_CALCULATOR_STORAGE_KEY = "inksync-calibration-calculator";
export const INKSYNC_DATA_MODEL_VERSION = 1;
const STORAGE_EVENT_PREFIX = "inksync:storage:";

const DEFAULT_CARD_TRANSFORM = Object.freeze({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
});

function normalizeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeCardTransform(value, fallback = DEFAULT_CARD_TRANSFORM) {
  const base = fallback ?? DEFAULT_CARD_TRANSFORM;
  const width = normalizeNumber(value?.width, base.width);
  const height = normalizeNumber(value?.height, base.height);
  return {
    x: normalizeNumber(value?.x, base.x),
    y: normalizeNumber(value?.y, base.y),
    width,
    height,
    rotation: normalizeNumber(value?.rotation, base.rotation),
  };
}

function normalizeFrameMap(frames, fallback = DEFAULT_CARD_TRANSFORM) {
  if (!frames || typeof frames !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(frames).map(([frameId, transform]) => [
      frameId,
      normalizeCardTransform(transform, fallback),
    ])
  );
}

function normalizeFrameIdList(frameIds) {
  if (!Array.isArray(frameIds)) {
    return [];
  }

  return Array.from(new Set(frameIds.filter((frameId) => typeof frameId === "string" && frameId)));
}

export function normalizeTrackingState(value) {
  if (!value || typeof value !== "object") {
    return { locked: false, reference: null };
  }

  return {
    locked: value.locked === true,
    reference: value.reference && typeof value.reference === "object"
      ? {
          centerX: normalizeNumber(value.reference.centerX),
          centerY: normalizeNumber(value.reference.centerY),
          areaRatio: normalizeNumber(value.reference.areaRatio),
          rotation: normalizeNumber(value.reference.rotation),
          confidence: normalizeNumber(value.reference.confidence),
        }
      : null,
  };
}

export function normalizeCalibrationMetrics(value) {
  if (!value || typeof value !== "object") {
    return {
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
      confidence: 0,
    };
  }

  return {
    brightness: normalizeNumber(value.brightness),
    sharpness: normalizeNumber(value.sharpness),
    motion: normalizeNumber(value.motion),
    areaRatio: normalizeNumber(value.areaRatio),
    aspectRatio: normalizeNumber(value.aspectRatio),
    centerX: normalizeNumber(value.centerX),
    centerY: normalizeNumber(value.centerY),
    boxWidthRatio: normalizeNumber(value.boxWidthRatio),
    boxHeightRatio: normalizeNumber(value.boxHeightRatio),
    rotation: normalizeNumber(value.rotation),
    confidence: normalizeNumber(value.confidence),
  };
}

export function buildCalibrationSnapshot(value) {
  return {
    schemaVersion: INKSYNC_DATA_MODEL_VERSION,
    savedAt: typeof value?.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    metrics: normalizeCalibrationMetrics(value?.metrics),
    tracking: normalizeTrackingState(value?.tracking),
    guidance: value?.guidance && typeof value.guidance === "object"
      ? {
          tone: typeof value.guidance.tone === "string" ? value.guidance.tone : "",
          headline: typeof value.guidance.headline === "string" ? value.guidance.headline : "",
          detail: typeof value.guidance.detail === "string" ? value.guidance.detail : "",
        }
      : {
          tone: "",
          headline: "",
          detail: "",
        },
    capturedPhoto: typeof value?.capturedPhoto === "string" ? value.capturedPhoto : "",
    captureReview: value?.captureReview && typeof value.captureReview === "object"
      ? {
          readiness: typeof value.captureReview.readiness === "string" ? value.captureReview.readiness : "not_ready",
          score: normalizeNumber(value.captureReview.score),
          summary: typeof value.captureReview.summary === "string" ? value.captureReview.summary : "",
          notes: Array.isArray(value.captureReview.notes)
            ? value.captureReview.notes.filter((note) => typeof note === "string")
            : [],
        }
      : {
          readiness: "not_ready",
          score: 0,
          summary: "",
          notes: [],
        },
  };
}

function buildFrameSnapshot(value, fallbackTransform = DEFAULT_CARD_TRANSFORM) {
  const frames = normalizeFrameMap(value?.frames, fallbackTransform);
  const activeFrame =
    typeof value?.activeFrame === "string"
      ? value.activeFrame
      : Object.keys(frames)[0] ?? "";
  const activeTransform = frames[activeFrame] ?? value?.frameOverlay ?? fallbackTransform;

  return {
    schemaVersion: INKSYNC_DATA_MODEL_VERSION,
    sourceWidth: normalizeNumber(value?.sourceWidth, 0),
    sourceHeight: normalizeNumber(value?.sourceHeight, 0),
    activeFrame,
    frameOverlay: normalizeCardTransform(activeTransform, fallbackTransform),
    frames,
    keyframes: normalizeFrameIdList(value?.keyframes),
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

export function buildOverlayCalibrationSnapshot(value, fallbackTransform = DEFAULT_CARD_TRANSFORM) {
  return buildFrameSnapshot(value, fallbackTransform);
}

export function buildSignatureRevealCalibrationSnapshot(value, fallbackTransform = DEFAULT_CARD_TRANSFORM) {
  return buildFrameSnapshot(value, fallbackTransform);
}

export function buildTrackedCardTransformFromSnapshot(snapshot, sourceSize, fallbackTransform = DEFAULT_CARD_TRANSFORM) {
  const metrics = snapshot?.metrics;
  if (!metrics || !sourceSize) {
    return null;
  }

  const widthRatio = normalizeNumber(metrics.boxWidthRatio);
  const heightRatio = normalizeNumber(metrics.boxHeightRatio);
  const centerX = normalizeNumber(metrics.centerX);
  const centerY = normalizeNumber(metrics.centerY);
  const sourceWidth = normalizeNumber(sourceSize.width);
  const sourceHeight = normalizeNumber(sourceSize.height);

  if (!(widthRatio > 0) || !(heightRatio > 0) || !(sourceWidth > 0) || !(sourceHeight > 0)) {
    return null;
  }

  const width = widthRatio * sourceWidth;
  const height = heightRatio * sourceHeight;
  const x = (centerX * sourceWidth) - (width / 2);
  const y = (centerY * sourceHeight) - (height / 2);

  return normalizeCardTransform(
    {
      ...fallbackTransform,
      x,
      y,
      width,
      height,
      rotation: normalizeNumber(metrics.rotation),
    },
    fallbackTransform
  );
}

function readStoredJson(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredJson(storageKey, value) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(
      new CustomEvent(`${STORAGE_EVENT_PREFIX}${storageKey}`, {
        detail: null,
      })
    );
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent(`${STORAGE_EVENT_PREFIX}${storageKey}`, {
      detail: value,
    })
  );
}

export function subscribeToStoredJson(storageKey, listener) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const eventName = `${STORAGE_EVENT_PREFIX}${storageKey}`;
  const handleEvent = (event) => {
    listener(event.detail ?? null);
  };

  window.addEventListener(eventName, handleEvent);
  return () => {
    window.removeEventListener(eventName, handleEvent);
  };
}

function normalizeCalculatorState(value) {
  if (!value || typeof value !== "object") {
    return {
      cardWidth: 0,
      cardHeight: 0,
      overlayWidth: 0,
      overlayHeight: 0,
      cardRotation: 0,
      overlayRotation: 0,
    };
  }

  return {
    cardWidth: normalizeNumber(value.cardWidth),
    cardHeight: normalizeNumber(value.cardHeight),
    overlayWidth: normalizeNumber(value.overlayWidth),
    overlayHeight: normalizeNumber(value.overlayHeight),
    cardRotation: normalizeNumber(value.cardRotation),
    overlayRotation: normalizeNumber(value.overlayRotation),
  };
}

export function getStoredHandedness() {
  if (typeof window === "undefined") {
    return "";
  }

  const value = window.localStorage.getItem(HANDEDNESS_STORAGE_KEY) ?? "";
  return HANDEDNESS_OPTIONS.includes(value) ? value : "";
}

export function setStoredHandedness(value) {
  if (typeof window === "undefined") {
    return;
  }

  if (!HANDEDNESS_OPTIONS.includes(value)) {
    window.localStorage.removeItem(HANDEDNESS_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(HANDEDNESS_STORAGE_KEY, value);
}

export function formatHandedness(value) {
  if (value === "left") {
    return "Left-handed";
  }
  if (value === "right") {
    return "Right-handed";
  }
  return "Not set";
}

export function getStoredProfilePhoto() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PROFILE_PHOTO_STORAGE_KEY) ?? "";
}

export function setStoredProfilePhoto(value) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(PROFILE_PHOTO_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(PROFILE_PHOTO_STORAGE_KEY, value);
}

export function getStoredCalibrationSnapshot() {
  const parsed = readStoredJson(CALIBRATION_SNAPSHOT_STORAGE_KEY);
  return parsed ? buildCalibrationSnapshot(parsed) : null;
}

export function setStoredCalibrationSnapshot(value) {
  writeStoredJson(CALIBRATION_SNAPSHOT_STORAGE_KEY, value ? buildCalibrationSnapshot(value) : null);
}

export function getStoredOverlayCalibration() {
  const parsed = readStoredJson(OVERLAY_CALIBRATION_STORAGE_KEY);
  return parsed ? buildOverlayCalibrationSnapshot(parsed) : null;
}

export function setStoredOverlayCalibration(value) {
  writeStoredJson(OVERLAY_CALIBRATION_STORAGE_KEY, value ? buildOverlayCalibrationSnapshot(value) : null);
}

export function getStoredSignatureRevealCalibration() {
  const parsed = readStoredJson(SIGNATURE_REVEAL_CALIBRATION_STORAGE_KEY);
  return parsed ? buildSignatureRevealCalibrationSnapshot(parsed) : null;
}

export function setStoredSignatureRevealCalibration(value) {
  writeStoredJson(
    SIGNATURE_REVEAL_CALIBRATION_STORAGE_KEY,
    value ? buildSignatureRevealCalibrationSnapshot(value) : null
  );
}

export function getStoredCalibrationCalculator() {
  const parsed = readStoredJson(CALIBRATION_CALCULATOR_STORAGE_KEY);
  return normalizeCalculatorState(parsed);
}

export function setStoredCalibrationCalculator(value) {
  writeStoredJson(
    CALIBRATION_CALCULATOR_STORAGE_KEY,
    value ? normalizeCalculatorState(value) : null
  );
}
