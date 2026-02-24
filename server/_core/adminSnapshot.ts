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

type SnapshotFile = {
  name: string;
  content: string;
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
const snapshotGithubRepo =
  process.env.ADMIN_SNAPSHOT_GITHUB_REPO ??
  (process.env.RAILWAY_GIT_REPO_OWNER && process.env.RAILWAY_GIT_REPO_NAME
    ? `${process.env.RAILWAY_GIT_REPO_OWNER}/${process.env.RAILWAY_GIT_REPO_NAME}`
    : "") ??
  "";
const snapshotGithubPath =
  process.env.ADMIN_SNAPSHOT_GITHUB_PATH ?? "data/admin";
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

function buildSnapshotFiles(data: AdminSnapshotData): SnapshotFile[] {
  return [
    {
      name: "meta.json",
      content: serialize({
        generatedAt: data.generatedAt,
        schemaVersion: 1,
      }),
    },
    { name: "site-content.json", content: serialize(data.siteContent) },
    { name: "site-images.json", content: serialize(data.siteImages) },
    { name: "portfolio-images.json", content: serialize(data.portfolioImages) },
    { name: "site-sections.json", content: serialize(data.siteSections) },
    { name: "packages.json", content: serialize(data.packages) },
    { name: "testimonials.json", content: serialize(data.testimonials) },
    { name: "contact-info.json", content: serialize(data.contactInfo) },
  ];
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

function githubPathFor(name: string) {
  const base = snapshotGithubPath.replace(/\/+$/, "");
  return `${base}/${name}`;
}

async function githubRequest<T>(
  pathName: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`https://api.github.com${pathName}`, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      authorization: `Bearer ${snapshotGitToken}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `GitHub API error (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }
  return (await response.json()) as T;
}

async function syncSnapshotViaGithubApi(files: SnapshotFile[]) {
  if (!snapshotGitToken) {
    console.warn(
      "[AdminSnapshot] GitHub API sync requires ADMIN_SNAPSHOT_GIT_TOKEN."
    );
    return;
  }
  if (!snapshotGithubRepo) {
    console.warn(
      "[AdminSnapshot] GitHub API sync requires ADMIN_SNAPSHOT_GITHUB_REPO=owner/repo."
    );
    return;
  }

  type RefResponse = { object: { sha: string } };
  type CommitResponse = { sha: string; tree: { sha: string } };
  type BlobResponse = { sha: string };
  type TreeResponse = { sha: string };

  const ref = await githubRequest<RefResponse>(
    `/repos/${snapshotGithubRepo}/git/ref/heads/${snapshotGitBranch}`
  );
  const baseCommit = await githubRequest<CommitResponse>(
    `/repos/${snapshotGithubRepo}/git/commits/${ref.object.sha}`
  );

  const treeItems = [];
  for (const file of files) {
    const blob = await githubRequest<BlobResponse>(
      `/repos/${snapshotGithubRepo}/git/blobs`,
      {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      }
    );
    treeItems.push({
      path: githubPathFor(file.name),
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const tree = await githubRequest<TreeResponse>(
    `/repos/${snapshotGithubRepo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: treeItems,
      }),
    }
  );

  const timestamp = new Date().toISOString();
  const commit = await githubRequest<CommitResponse>(
    `/repos/${snapshotGithubRepo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: `${snapshotGitCommitPrefix} ${timestamp}`,
        tree: tree.sha,
        parents: [baseCommit.sha],
      }),
    }
  );

  await githubRequest(
    `/repos/${snapshotGithubRepo}/git/refs/heads/${snapshotGitBranch}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    }
  );
}

async function syncSnapshotToGit(files: SnapshotFile[]) {
  if (!snapshotGitEnabled) return;
  const canUseGit = await isGitRepo();
  try {
    if (canUseGit) {
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
      return;
    }
  } catch (error) {
    console.warn("[AdminSnapshot] Git sync failed:", error);
  }

  await syncSnapshotViaGithubApi(files);
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
  const files = buildSnapshotFiles(data);
  await Promise.all(
    files.map((file) =>
      fs.writeFile(path.join(snapshotDir, file.name), file.content, "utf8")
    )
  );

  await syncSnapshotToGit(files);
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
