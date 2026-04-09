const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
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

export async function apiCoachChat() {
  return {
    persona: "InkSync",
    reply: "Coach features are disabled in this build.",
  };
}
