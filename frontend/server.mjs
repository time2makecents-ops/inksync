import fs from "fs";
import https from "https";
import net from "net";
import os from "os";
import path from "path";
import next from "next";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = false;
const hostname = "0.0.0.0";
const preferredPort = Number.parseInt(process.env.PORT ?? "3215", 10);
const maxPortAttempts = 10;

const certPath = path.join(__dirname, "certificates", "localhost.pem");
const keyPath = path.join(__dirname, "certificates", "localhost-key.pem");

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  throw new Error(`HTTPS certificate files not found. Expected:\n${certPath}\n${keyPath}`);
}

function logReady(port) {
  console.log(`> Ready on https://localhost:${port}`);
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        console.log(`> LAN URL: https://${address.address}:${port}`);
      }
    }
  }
}

function canListenOnPort(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();

    tester.once("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      reject(error);
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, hostname);
  });
}

async function resolvePort(startPort) {
  for (let attempt = 0; attempt <= maxPortAttempts; attempt += 1) {
    const port = startPort + attempt;
    const available = await canListenOnPort(port);
    if (available) {
      if (attempt > 0) {
        console.warn(`> Port ${startPort} is in use. Using ${port} instead.`);
      }
      return port;
    }
  }

  throw new Error(`No open port found in range ${startPort}-${startPort + maxPortAttempts}.`);
}

async function startServer() {
  const port = await resolvePort(preferredPort);
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    (req, res) => handle(req, res)
  );

  server.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  server.listen(port, hostname, () => logReady(port));
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
