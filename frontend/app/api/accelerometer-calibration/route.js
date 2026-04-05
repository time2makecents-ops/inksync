import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const LOG_DIR = path.join(process.cwd(), "..", "data");
const LOG_PATH = path.join(LOG_DIR, "accelerometer-calibration-log.jsonl");

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const payload = await request.json();
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");

    return NextResponse.json({ ok: true, path: LOG_PATH });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "log write failed" },
      { status: 500 }
    );
  }
}
