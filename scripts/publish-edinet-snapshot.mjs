import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const logDir = join(rootDir, "logs");
const logPath = join(logDir, "edinet-refresh.log");
const commandEnv = {
  ...process.env,
  PATH: ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH].filter(Boolean).join(":"),
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: commandEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} ${args.join(" ")} failed with ${code}\n${stderr}`));
    });
  });

const log = async (message) => {
  await mkdir(logDir, { recursive: true });
  await appendFile(logPath, `[${new Date().toISOString()}] ${message}\n`);
};

const hasChanges = async () => {
  const status = await run("git", ["status", "--short"]);
  return status.length > 0;
};

const main = async () => {
  await log("start");
  await run("node", ["scripts/refresh-edinet-snapshot.mjs"]);

  if (!(await hasChanges())) {
    await log("no changes");
    return;
  }

  await run("npm", ["run", "build"]);
  await run("git", ["add", "api/_shared/edinet-snapshot.js", "public/edinet-cache"]);
  if (!(await hasChanges())) {
    await log("no staged changes");
    return;
  }

  const timestamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  await run("git", ["commit", "-m", `Refresh EDINET snapshot ${timestamp}`]);
  await run("git", ["push", "origin", "main"]);
  await run("vercel", ["deploy", "--prod", "--scope", "tomomi-eras-projects"]);
  await log("deployed");
};

main().catch(async (error) => {
  await log(`error ${error.message}`);
  console.error(error);
  process.exitCode = 1;
});
