import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

export type AdminSnapshotData = {
  generatedAt: string;
  siteContent: unknown[];
  siteImages: unknown[];
  portfolioImages: unknown[];
  siteSections: unknown[];
  packages: unknown[];
  testimonials: unknown[];
  contactInfo: unknown[];
};

const snapshotEnabled =
  (process.env.ADMIN_SNAPSHOT_DISABLED ?? "false") !== "true";
const snapshotDir =
  process.env.ADMIN_SNAPSHOT_DIR ??
  path.resolve(process.cwd(), "data", "admin");
const snapshotGitToken =
  process.env.ADMIN_SNAPSHOT_GIT_TOKEN ??
  process.env.GITHUB_TOKEN ??
  process.env.GH_TOKEN ??
  "";
const snapshotGitEnabled =
  (process.env.ADMIN_SNAPSHOT_GIT_ENABLED ??
    (snapshotGitToken ? "true" : "false")) === "true";
const snapshotGitDir =
  process.env.ADMIN_SNAPSHOT_GIT_DIR ?? process.cwd();
const snapshotGitRemote =
  process.env.ADMIN_SNAPSHOT_GIT_REMOTE ?? "origin";
const snapshotGitRemoteUrl =
  process.env.ADMIN_SNAPSHOT_GIT_REMOTE_URL ?? "";
const snapshotGitBranch =
  process.env.ADMIN_SNAPSHOT_GIT_BRANCH ?? "main";
const snapshotGitCommitPrefix =
  process.env.ADMIN_SNAPSHOT_GIT_COMMIT_PREFIX ?? "chore(admin): snapshot";

let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
const execFileAsync = promisify(execFile);

function serialize(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (item instanceof Date ? item.toISOString() : item),
    2
  );
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, serialize(data), "utf8");
}

async function runGit(args: string[]) {
  await execFileAsync("git", args, { cwd: snapshotGitDir });
}

async function isGitRepo() {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd: snapshotGitDir }
    );
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function getRemoteUrl() {
  if (snapshotGitRemoteUrl) return snapshotGitRemoteUrl;
  const { stdout } = await execFileAsync(
    "git",
    ["remote", "get-url", snapshotGitRemote],
    { cwd: snapshotGitDir }
  );
  return stdout.trim();
}

function withToken(remoteUrl: string) {
  if (!snapshotGitToken) return remoteUrl;
  if (remoteUrl.startsWith("https://")) {
    return remoteUrl.replace("https://", `https://${snapshotGitToken}@`);
  }
  if (remoteUrl.startsWith("http://")) {
    return remoteUrl.replace("http://", `http://${snapshotGitToken}@`);
  }
  const sshMatch = remoteUrl.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    return `https://${snapshotGitToken}@${sshMatch[1]}/${sshMatch[2]}`;
  }
  return remoteUrl;
}

async function hasSnapshotChanges() {
  const relativePath = path.relative(snapshotGitDir, snapshotDir);
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain", "--", relativePath],
    { cwd: snapshotGitDir }
  );
  return stdout.trim().length > 0;
}

async function syncSnapshotToGit() {
  if (!snapshotGitEnabled) return;
  if (!(await isGitRepo())) return;
  try {
    const relativePath = path.relative(snapshotGitDir, snapshotDir);
    const hasChanges = await hasSnapshotChanges();
    if (!hasChanges) return;

    await runGit(["add", relativePath]);

    const timestamp = new Date().toISOString();
    await runGit(["commit", "-m", `${snapshotGitCommitPrefix} ${timestamp}`]);
    const remoteUrl = await getRemoteUrl().catch(() => "");
    if (!snapshotGitToken && /^https?:\/\//.test(remoteUrl)) {
      console.warn(
        "[AdminSnapshot] Skipping push: set ADMIN_SNAPSHOT_GIT_TOKEN (or GITHUB_TOKEN) for HTTPS remotes."
      );
      return;
    }
    if (remoteUrl) {
      const authedUrl = withToken(remoteUrl);
      await runGit(["push", authedUrl, snapshotGitBranch]);
      return;
    }
    await runGit(["push", snapshotGitRemote, snapshotGitBranch]);
  } catch (error) {
    console.warn("[AdminSnapshot] Git sync failed:", error);
  }
}

export async function readAdminSnapshotFile<T>(
  filename: string,
  fallback: T
): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(snapshotDir, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn("[AdminSnapshot] Failed to read snapshot file:", error);
    }
    return fallback;
  }
}

export async function writeAdminSnapshot(data: AdminSnapshotData) {
  if (!snapshotEnabled) return;
  await fs.mkdir(snapshotDir, { recursive: true });

  await writeJson(path.join(snapshotDir, "meta.json"), {
    generatedAt: data.generatedAt,
    schemaVersion: 1,
  });
  await writeJson(path.join(snapshotDir, "site-content.json"), data.siteContent);
  await writeJson(path.join(snapshotDir, "site-images.json"), data.siteImages);
  await writeJson(
    path.join(snapshotDir, "portfolio-images.json"),
    data.portfolioImages
  );
  await writeJson(path.join(snapshotDir, "site-sections.json"), data.siteSections);
  await writeJson(path.join(snapshotDir, "packages.json"), data.packages);
  await writeJson(
    path.join(snapshotDir, "testimonials.json"),
    data.testimonials
  );
  await writeJson(path.join(snapshotDir, "contact-info.json"), data.contactInfo);

  await syncSnapshotToGit();
}

export function queueAdminSnapshot(
  writer: () => Promise<AdminSnapshotData | null>
) {
  if (!snapshotEnabled) return;
  if (snapshotTimer) {
    clearTimeout(snapshotTimer);
  }
  snapshotTimer = setTimeout(async () => {
    snapshotTimer = null;
    try {
      const data = await writer();
      if (data) {
        await writeAdminSnapshot(data);
      }
    } catch (error) {
      console.warn("[AdminSnapshot] Failed to write snapshot:", error);
    }
  }, 600);
}
