import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const CAPTURE_ROOT = path.join(process.cwd(), "..", "test_captures");

function sanitizeSessionId(value) {
  return String(value || "burst")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image payload.");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.includes("png") ? "png" : "jpg";
  return {
    mimeType,
    extension,
    buffer: Buffer.from(base64, "base64"),
  };
}

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const payload = await request.json();
    const sessionId = sanitizeSessionId(payload?.sessionId || new Date().toISOString().replace(/[:.]/g, "-"));
    const frames = Array.isArray(payload?.frames) ? payload.frames : [];

    if (!frames.length) {
      return NextResponse.json({ ok: false, error: "No burst frames provided." }, { status: 400 });
    }

    const sessionDir = path.join(CAPTURE_ROOT, sessionId);
    await mkdir(sessionDir, { recursive: true });

    const savedFrames = [];

    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      const decoded = decodeDataUrl(frame?.dataUrl);
      const filename = `frame-${String(index + 1).padStart(2, "0")}.${decoded.extension}`;
      const absolutePath = path.join(sessionDir, filename);
      await writeFile(absolutePath, decoded.buffer);
      savedFrames.push({
        index: index + 1,
        filename,
        capturedAt: frame?.capturedAt || null,
      });
    }

    const manifest = {
      sessionId,
      savedAt: new Date().toISOString(),
      triggerMode: payload?.triggerMode || "manual",
      threshold: Number(payload?.threshold ?? 0),
      countdownSeconds: Number(payload?.countdownSeconds ?? 0),
      burstFrameCount: frames.length,
      frameIntervalMs: Number(payload?.frameIntervalMs ?? 0),
      bestFrameIndex: Number(payload?.bestFrameIndex ?? 1),
      metrics: payload?.metrics || null,
      savedFrames,
    };

    await writeFile(path.join(sessionDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      sessionId,
      directory: sessionDir,
      frameCount: savedFrames.length,
      bestFrame: savedFrames[Math.max(0, Math.min(savedFrames.length - 1, manifest.bestFrameIndex - 1))] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Burst save failed." },
      { status: 500 }
    );
  }
}
