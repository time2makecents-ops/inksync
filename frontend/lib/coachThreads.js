const STORAGE_PREFIX = "flipperiq-room-coach:v1:";

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
  if (!canUseSessionStorage()) {
    return { roomLabel, messages: initialMessages, draft: initialDraft, hasSavedThread: false };
  }

  try {
    const raw = window.sessionStorage.getItem(createCoachThreadKey(pageKey));
    if (!raw) {
      return { roomLabel, messages: initialMessages, draft: initialDraft, hasSavedThread: false };
    }

    const parsed = JSON.parse(raw);
    return {
      roomLabel: parsed.roomLabel || roomLabel,
      messages: normalizeMessages(parsed.messages, initialMessages),
      draft: typeof parsed.draft === "string" ? parsed.draft : initialDraft,
      hasSavedThread: true,
    };
  } catch {
    return { roomLabel, messages: initialMessages, draft: initialDraft, hasSavedThread: false };
  }
}

export function saveCoachThread(pageKey, { roomLabel, messages = [], draft = "" }) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    createCoachThreadKey(pageKey),
    JSON.stringify({
      roomLabel,
      messages,
      draft,
      updatedAt: Date.now(),
    })
  );
}

export function getOtherCoachThreadContext(pageKey, { maxThreads = 4, maxMessagesPerThread = 2 } = {}) {
  if (!canUseSessionStorage()) {
    return "";
  }

  const currentKey = createCoachThreadKey(pageKey);
  const summaries = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const storageKey = window.sessionStorage.key(index);
    if (!storageKey || !storageKey.startsWith(STORAGE_PREFIX) || storageKey === currentKey) {
      continue;
    }

    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) || "null");
      if (!parsed || !Array.isArray(parsed.messages) || !parsed.messages.length) {
        continue;
      }

      const roomLabel = parsed.roomLabel || storageKey.slice(STORAGE_PREFIX.length);
      const recentMessages = parsed.messages
        .filter((entry) => entry && typeof entry === "object" && !entry.pending)
        .slice(-maxMessagesPerThread)
        .map((entry) => {
          const speaker = entry.speaker || entry.sender || "Unknown";
          const text = typeof entry.text === "string" ? entry.text.trim() : "";
          return text ? `${speaker}: ${text}` : "";
        })
        .filter(Boolean);

      if (!recentMessages.length) {
        continue;
      }

      summaries.push({
        roomLabel,
        updatedAt: Number(parsed.updatedAt) || 0,
        summary: `- ${roomLabel}: ${recentMessages.join(" | ")}`,
      });
    } catch {
      continue;
    }
  }

  return summaries
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, maxThreads)
    .map((entry) => entry.summary)
    .join("\n");
}

