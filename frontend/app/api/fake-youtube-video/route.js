import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";

const VIDEO_PATH = path.resolve(process.cwd(), "..", "fake_youtube", "youtube_magician.mp4");
const CHUNK_SIZE = 1024 * 1024;

function buildHeaders({ start, end, size, contentLength, partial }) {
  return {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Length": String(contentLength),
    "Content-Type": "video/mp4",
    ...(partial ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
  };
}

export async function GET(request) {
  if (!existsSync(VIDEO_PATH)) {
    return new Response("Video not found.", { status: 404 });
  }

  const stats = await fs.stat(VIDEO_PATH);
  const size = stats.size;
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    const stream = createReadStream(VIDEO_PATH);
    return new Response(stream, {
      status: 200,
      headers: buildHeaders({
        start: 0,
        end: size - 1,
        size,
        contentLength: size,
        partial: false,
      }),
    });
  }

  const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!matches) {
    return new Response("Invalid range header.", { status: 416 });
  }

  const start = Number.parseInt(matches[1], 10);
  const requestedEnd = matches[2] ? Number.parseInt(matches[2], 10) : undefined;
  const end = Math.min(requestedEnd ?? start + CHUNK_SIZE - 1, size - 1);

  if (Number.isNaN(start) || Number.isNaN(end) || start >= size || start > end) {
    return new Response("Requested range not satisfiable.", {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  const contentLength = end - start + 1;
  const stream = createReadStream(VIDEO_PATH, { start, end });

  return new Response(stream, {
    status: 206,
    headers: buildHeaders({
      start,
      end,
      size,
      contentLength,
      partial: true,
    }),
  });
}
