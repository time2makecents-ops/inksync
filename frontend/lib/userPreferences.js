export const HANDEDNESS_STORAGE_KEY = "flipperiq-handedness";
export const HANDEDNESS_OPTIONS = ["right", "left"];
export const PROFILE_PHOTO_STORAGE_KEY = "flipperiq-profile-photo";
export const CALIBRATION_SNAPSHOT_STORAGE_KEY = "inksync-calibration-snapshot";
export const OVERLAY_CALIBRATION_STORAGE_KEY = "inksync-overlay-calibration";

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
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(CALIBRATION_SNAPSHOT_STORAGE_KEY);
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

export function setStoredCalibrationSnapshot(value) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(CALIBRATION_SNAPSHOT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(CALIBRATION_SNAPSHOT_STORAGE_KEY, JSON.stringify(value));
}

export function getStoredOverlayCalibration() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(OVERLAY_CALIBRATION_STORAGE_KEY);
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

export function setStoredOverlayCalibration(value) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(OVERLAY_CALIBRATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(OVERLAY_CALIBRATION_STORAGE_KEY, JSON.stringify(value));
}
