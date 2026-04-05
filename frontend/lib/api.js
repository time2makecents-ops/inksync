const BACKEND_URL = process.env.FLIPPERIQ_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = "Request failed.";

    try {
      const body = await response.json();
      message = body.detail ?? JSON.stringify(body);
    } catch {
      message = await response.text();
    }

    const error = new Error(message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }

  return response.json();
}

export function backendUrl(path) {
  return `${BACKEND_URL}${path}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldRetryCoachRequest(error) {
  const status = typeof error?.status === "number" ? error.status : 0;
  const message = String(error?.message ?? "").toLowerCase();

  if ([502, 503, 504].includes(status)) {
    return true;
  }

  return (
    message.includes("failed to fetch")
    || message.includes("network")
    || message.includes("timeout")
    || message.includes("temporarily")
    || message.includes("unavailable")
    || message.includes("gemini failed")
  );
}

export async function apiCoachChat(payload, { retries = 1, retryDelayMs = 450 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await apiFetch("/coach/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response || typeof response.reply !== "string" || !response.reply.trim()) {
        throw new Error("Coach reply was empty.");
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetryCoachRequest(error)) {
        break;
      }

      await wait(retryDelayMs * (attempt + 1));
    }
  }

  const message = String(lastError?.message ?? "");
  if (message.toLowerCase().includes("gemini failed")) {
    throw new Error("Coach service is temporarily unavailable. Please try again.");
  }

  throw lastError instanceof Error ? lastError : new Error("Coach reply failed.");
}
