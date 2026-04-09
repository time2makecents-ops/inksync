const STORAGE_PREFIX = "inksync-room-coach-compat:v1:";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function normalizeMessages(messages, initialMessages) {
  if (!Array.isArray(messages) || !messages.length) {
    return initialMessages;
  }

  return messages.filter((entry) => entry && typeof entry === "object");
}

export function createCoachThreadKey(pageKey) {
  return `${STORAGE_PREFIX}${pageKey}`;
}

export function loadCoachThread(pageKey, { roomLabel, initialMessages = [], initialDraft = "" } = {}) {
  return { roomLabel, messages: initialMessages, draft: initialDraft, hasSavedThread: false };
}

export function saveCoachThread(pageKey, { roomLabel, messages = [], draft = "" }) {
  return;
}

export function getOtherCoachThreadContext() {
  return "";
}
