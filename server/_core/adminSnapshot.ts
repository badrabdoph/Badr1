import fs from "fs/promises";
import path from "path";

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

let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

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
