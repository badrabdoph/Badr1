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
const snapshotGitEnabled =
  (process.env.ADMIN_SNAPSHOT_GIT_ENABLED ?? "false") === "true";
const snapshotGitDir =
  process.env.ADMIN_SNAPSHOT_GIT_DIR ?? process.cwd();
const snapshotGitRemote =
  process.env.ADMIN_SNAPSHOT_GIT_REMOTE ?? "origin";
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

async function syncSnapshotToGit() {
  if (!snapshotGitEnabled) return;
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: snapshotGitDir,
    });
    if (!stdout.trim()) return;

    await runGit(["add", path.relative(snapshotGitDir, snapshotDir)]);

    const timestamp = new Date().toISOString();
    await runGit(["commit", "-m", `${snapshotGitCommitPrefix} ${timestamp}`]);
    await runGit(["push", snapshotGitRemote, snapshotGitBranch]);
  } catch (error) {
    console.warn("[AdminSnapshot] Git sync failed:", error);
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
