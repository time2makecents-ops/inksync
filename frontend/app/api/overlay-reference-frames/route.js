import fs from "fs";
import path from "path";

const FRAMES_DIR = path.resolve(process.cwd(), "..", "scratch_frames");
const FRAME_PATTERN = /^frame_\d{2}_\d\.png$/;
const SOURCE_WIDTH = 1080;
const SOURCE_HEIGHT = 1920;

export async function GET() {
  if (!fs.existsSync(FRAMES_DIR)) {
    return Response.json(
      {
        frames: [],
        sourceWidth: SOURCE_WIDTH,
        sourceHeight: SOURCE_HEIGHT,
      },
      { status: 200 }
    );
  }

  const frames = fs
    .readdirSync(FRAMES_DIR)
    .filter((name) => FRAME_PATTERN.test(name))
    .sort()
    .map((name) => ({
      id: name.replace(".png", ""),
      label: name.replace("frame_", "").replace("_", ".").replace(".png", "s"),
      src: `/api/overlay-reference-image/${name}`,
    }));

  return Response.json({
    frames,
    sourceWidth: SOURCE_WIDTH,
    sourceHeight: SOURCE_HEIGHT,
  });
}
