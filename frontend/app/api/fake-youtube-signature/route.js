import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";

const SIGNATURE_PATH = path.resolve(process.cwd(), "..", "output", "extracted_signature.png");

export async function GET() {
  if (!existsSync(SIGNATURE_PATH)) {
    return new Response("Signature overlay not found.", { status: 404 });
  }

  const stats = await fs.stat(SIGNATURE_PATH);
  const stream = createReadStream(SIGNATURE_PATH);

  return new Response(stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Length": String(stats.size),
      "Content-Type": "image/png",
    },
  });
}
