import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const BACKUP_PATH = path.join(process.cwd(), "docs", "overlay_calibration_backup.json");

async function ensureBackupDir() {
  await mkdir(path.dirname(BACKUP_PATH), { recursive: true });
}

export async function GET() {
  try {
    const raw = await readFile(BACKUP_PATH, "utf8");
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json({ frames: null }, { status: 404 });
  }
}

export async function POST(request) {
  const payload = await request.json();
  await ensureBackupDir();
  await writeFile(BACKUP_PATH, JSON.stringify(payload, null, 2), "utf8");
  return Response.json({ ok: true });
}
