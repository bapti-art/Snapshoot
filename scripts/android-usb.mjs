import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const HEALTH_URL = "http://127.0.0.1:4000/api/health";
const CAP_TARGET = process.env.ANDROID_TARGET;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${command} ${args.join(" ")} exited with code ${code}`),
        );
      }
    });
  });
}

async function isBackendHealthy() {
  try {
    const response = await fetch(HEALTH_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(maxAttempts = 40, intervalMs = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (await isBackendHealthy()) {
      return true;
    }
    await delay(intervalMs);
  }

  return false;
}

async function getUsbTarget() {
  if (CAP_TARGET) {
    return CAP_TARGET;
  }

  const output = await new Promise((resolve, reject) => {
    const child = spawn("adb", ["devices"], { shell: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || "Impossible de lister les appareils ADB."));
      }
    });
  });

  const lines = String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const deviceLine = lines.find(
    (line) => /\tdevice$/.test(line) && !line.startsWith("List of devices"),
  );
  if (!deviceLine) {
    throw new Error("Aucun appareil Android USB détecté.");
  }

  return deviceLine.split(/\s+/)[0];
}

async function main() {
  const backendReady = await isBackendHealthy();
  if (!backendReady) {
    const serverProcess = spawn("npm", ["run", "server"], {
      stdio: "inherit",
      shell: true,
    });
    const started = await waitForBackend();
    if (!started) {
      serverProcess.kill();
      throw new Error(
        "Le backend n'a pas répondu sur http://localhost:4000/api/health.",
      );
    }
  }

  await run("adb", ["reverse", "tcp:4000", "tcp:4000"]);
  const target = await getUsbTarget();
  await run("npx", ["cap", "run", "android", "--target", target]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
