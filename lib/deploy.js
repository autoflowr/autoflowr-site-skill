import { spawn } from "node:child_process";
import kleur from "kleur";
import path from "node:path";
import fs from "fs-extra";

/**
 * Deploy the generated project to Vercel production.
 * Returns the deployed URL parsed from CLI output.
 */
export async function deployVercel(projectDir) {
  console.log(kleur.bold("→ Deploying to Vercel..."));
  return new Promise((resolve, reject) => {
    const proc = spawn(vercelCmd(), ["deploy", "--prod", "--yes"], {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "inherit"],
      shell: true,
    });

    let stdout = "";
    proc.stdout.on("data", (b) => {
      const text = String(b);
      stdout += text;
      process.stdout.write(text);
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`vercel deploy exited with code ${code}. Is the Vercel CLI installed and authenticated? (npm i -g vercel && vercel login)`));
      }
      const m = stdout.match(/https:\/\/[a-z0-9-]+\.vercel\.app/i);
      if (!m) return reject(new Error("Couldn't parse Vercel URL from output."));
      resolve(m[0]);
    });
  });
}

/**
 * Push the generated project to a new public GitHub repo.
 * Requires gh CLI authenticated.
 */
export async function pushGitHub({ projectDir, repoOwner, slug }) {
  if (!repoOwner) {
    throw new Error("--repo-owner is required for --push (e.g., --repo-owner autoflowr)");
  }
  console.log(kleur.bold(`→ Creating GitHub repo ${repoOwner}/${slug} and pushing...`));

  const gitDir = path.join(projectDir, ".git");
  if (!(await fs.pathExists(gitDir))) {
    await runIn(projectDir, "git", ["init"]);
    await runIn(projectDir, "git", ["add", "-A"]);
    await runIn(projectDir, "git", ["commit", "-m", "Initial commit (autoflowr-site-skill)"]);
    await runIn(projectDir, "git", ["branch", "-M", "main"]);
  }

  await runIn(projectDir, ghCmd(), [
    "repo", "create", `${repoOwner}/${slug}`,
    "--public",
    "--source", ".",
    "--push",
    "--remote", "origin",
  ]);

  return `https://github.com/${repoOwner}/${slug}`;
}

function vercelCmd() { return process.platform === "win32" ? "vercel.cmd" : "vercel"; }
function ghCmd() { return process.platform === "win32" ? "gh.exe" : "gh"; }

function runIn(cwd, cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit", shell: true });
    p.on("error", reject);
    p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} → exit ${code}`)));
  });
}

export async function checkVercelInstalled() {
  return new Promise((resolve) => {
    const p = spawn(vercelCmd(), ["--version"], { shell: true });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

export async function checkGhInstalled() {
  return new Promise((resolve) => {
    const p = spawn(ghCmd(), ["--version"], { shell: true });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}
