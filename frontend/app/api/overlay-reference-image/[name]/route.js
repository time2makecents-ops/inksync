import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";

const FRAMES_DIR = path.resolve(process.cwd(), "..", "scratch_frames");
const SAFE_NAME = /^frame_\d{2}_\d\.png$/;

export async function GET(_request, { params }) {
  const name = params?.name ?? "";
  if (!SAFE_NAME.test(name)) {
    return new Response("Invalid frame name.", { status: 400 });
  }

  const filePath = path.join(FRAMES_DIR, name);
  if (!existsSync(filePath)) {
    return new Response("Frame not found.", { status: 404 });
  }

  const stats = await fs.stat(filePath);
  const stream = createReadStream(filePath);

  return new Response(stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Length": String(stats.size),
      "Content-Type": "image/png",
    },
  });
}
