import { spawn } from "node:child_process";
import kleur from "kleur";
import os from "node:os";

const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

/**
 * Spawn `npm run dev` and `cloudflared tunnel --url http://localhost:<port>` in parallel.
 * Resolves once the tunnel URL is parsed from cloudflared stderr.
 *
 * Caller is responsible for keeping the parent process alive (this fn returns
 * after the URL is captured; the child processes keep running until SIGINT).
 */
export async function startDevWithTunnel({ projectDir, port = 3000, install = true }) {
  if (install) {
    await runInstall(projectDir);
  }

  const dev = spawn(npmCmd(), ["run", "dev"], {
    cwd: projectDir,
    stdio: ["ignore", "inherit", "inherit"],
    shell: true,
    env: { ...process.env, PORT: String(port) },
  });

  console.log(kleur.gray(`  dev server starting on port ${port}...`));

  // Wait briefly for Next to start so cloudflared has something to tunnel to.
  await waitForPort(port, 30_000);
  console.log(kleur.green("✓ Dev server up"));

  console.log(kleur.gray("  starting cloudflared tunnel..."));
  const tunnel = spawn(cloudflaredCmd(), ["tunnel", "--url", `http://localhost:${port}`], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  let tunnelUrl = "";
  const onData = (buf) => {
    const text = String(buf);
    const m = text.match(TUNNEL_URL_RE);
    if (m && !tunnelUrl) {
      tunnelUrl = m[0];
      console.log("");
      console.log(kleur.bold().green("✓ Tunnel ready:"));
      console.log("  " + kleur.cyan().underline(tunnelUrl));
      console.log("");
      console.log(kleur.gray("  Share this URL — works on phone, no DNS needed."));
      console.log(kleur.gray("  Ctrl+C to stop dev server + tunnel."));
    }
  };
  tunnel.stdout.on("data", onData);
  tunnel.stderr.on("data", onData);

  const cleanup = () => {
    try { tunnel.kill(); } catch {}
    try { dev.kill(); } catch {}
  };
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });

  // Wait up to 60s for the tunnel URL.
  const url = await waitFor(() => tunnelUrl, 60_000);
  if (!url) {
    cleanup();
    throw new Error("Tunnel did not produce a URL within 60s. Is `cloudflared` installed? (winget install --id Cloudflare.cloudflared)");
  }
  return { url, dev, tunnel, cleanup };
}

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function cloudflaredCmd() {
  return process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
}

async function runInstall(projectDir) {
  console.log(kleur.gray("  npm install (one-time, ~30s)..."));
  return new Promise((resolve, reject) => {
    const npmI = spawn(npmCmd(), ["install"], {
      cwd: projectDir,
      stdio: "inherit",
      shell: true,
    });
    npmI.on("close", (code) => {
      if (code === 0) {
        console.log(kleur.green("✓ Dependencies installed"));
        resolve();
      } else {
        reject(new Error(`npm install exited with code ${code}`));
      }
    });
  });
}

async function waitForPort(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`http://localhost:${port}/`).catch(() => null);
      if (resp) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function waitFor(predicate, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = predicate();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

export async function checkCloudflaredInstalled() {
  return new Promise((resolve) => {
    const p = spawn(cloudflaredCmd(), ["--version"], { shell: true });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}
