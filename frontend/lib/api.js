const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
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

export async function apiFetch(path, options = {}) {
  return request(`/api${path}`, options);
}

export function backendUrl(path) {
  return `${BACKEND_URL}${path}`;
}

export async function apiPing() {
  return request("/api/ping");
}

export async function apiSaveCalibration(data) {
  return request("/api/calibration/save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiLoadCalibration() {
  return request("/api/calibration/load");
}

export async function apiSaveAccelerometer(data) {
  return request("/api/accelerometer/save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiSaveSignature(data) {
  return request("/api/signature/save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiSaveOverlay(data) {
  return request("/api/overlay/save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiStartSession(data) {
  return request("/api/session/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiEndSession(data) {
  return request("/api/session/end", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiWatchEvent(data) {
  return request("/api/watch/event", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiCoachChat() {
  return {
    persona: "InkSync",
    reply: "Coach features are disabled in this build.",
  };
}

export async function apiPlaceholder() {
  return { status: "ok" };
}
