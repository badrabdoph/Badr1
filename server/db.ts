import { eq, asc, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import type { Pool } from "mysql2";
import fs from "fs/promises";
import path from "path";
import { 
  InsertUser, 
  users, 
  siteContent, 
  siteImages, 
  portfolioImages, 
  siteSections, 
  packages, 
  testimonials, 
  contactInfo,
  shareLinks,
  InsertSiteContent,
  InsertSiteImage,
  InsertPortfolioImage,
  InsertSiteSection,
  InsertPackage,
  InsertTestimonial,
  InsertContactInfo,
  InsertShareLink,
} from "../drizzle/schema";
import type {
  SiteContent,
  SiteImage,
  PortfolioImage,
  SiteSection,
  Package,
  Testimonial,
  ContactInfo,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import {
  createLocalShareLink,
  getLocalShareLinkByCode,
  listLocalShareLinks,
  revokeLocalShareLink,
  extendLocalShareLink,
} from "./_core/shareLinkStore";
import {
  queueAdminSnapshot,
  readAdminSnapshotFile,
  type AdminSnapshotData,
} from "./_core/adminSnapshot";
import {
  getLocalSiteContentByKey,
  listLocalSiteContent,
  upsertLocalSiteContent,
  deleteLocalSiteContent,
} from "./_core/siteContentStore";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
let _autoMigrate: Promise<void> | null = null;

const AUTO_MIGRATE =
  (process.env.DB_AUTO_MIGRATE ?? "true") === "true";
const MIGRATIONS_DIR =
  process.env.DB_MIGRATIONS_DIR ?? path.resolve(process.cwd(), "drizzle");
const REQUIRED_TABLES = [
  "users",
  "site_content",
  "site_images",
  "portfolio_images",
  "site_sections",
  "packages",
  "testimonials",
  "contact_info",
  "share_links",
];
const EXTRA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`share_links\` (
\t\`id\` int AUTO_INCREMENT NOT NULL,
\t\`code\` varchar(120) NOT NULL,
\t\`note\` text,
\t\`expiresAt\` timestamp,
\t\`revokedAt\` timestamp,
\t\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\t\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
\tCONSTRAINT \`share_links_id\` PRIMARY KEY(\`id\`),
\tCONSTRAINT \`share_links_code_unique\` UNIQUE(\`code\`)
);`,
];

async function shouldAutoMigrate() {
  if (!AUTO_MIGRATE) return false;
  if (!_pool) return false;
  try {
    const [rows] = await _pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?)",
      [REQUIRED_TABLES]
    );
    const existing = new Set(
      Array.isArray(rows)
        ? rows.map((row: any) => row.table_name || row.TABLE_NAME)
        : []
    );
    return existing.size < REQUIRED_TABLES.length;
  } catch (error) {
    console.warn("[Database] Auto-migrate check failed:", error);
    return false;
  }
}

function normalizeStatement(statement: string) {
  if (/^CREATE TABLE\s+IF NOT EXISTS/i.test(statement)) return statement;
  return statement.replace(/^CREATE TABLE\s+/i, "CREATE TABLE IF NOT EXISTS ");
}

async function loadMigrationStatements() {
  try {
    const entries = await fs.readdir(MIGRATIONS_DIR);
    const files = entries.filter((file) => file.endsWith(".sql")).sort();
    const statements: string[] = [];
    for (const file of files) {
      const raw = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const parts = raw
        .split("--> statement-breakpoint")
        .map((part) => part.trim())
        .filter(Boolean)
        .map(normalizeStatement);
      statements.push(...parts);
    }
    for (const extra of EXTRA_STATEMENTS) {
      const exists = statements.some((stmt) => stmt.includes("`share_links`"));
      if (!exists) statements.push(extra);
    }
    return statements;
  } catch (error) {
    console.warn("[Database] Failed to load migrations:", error);
    return [...EXTRA_STATEMENTS];
  }
}

async function runAutoMigrate(db: ReturnType<typeof drizzle>) {
  if (_autoMigrate) return _autoMigrate;
  _autoMigrate = (async () => {
    const needsMigration = await shouldAutoMigrate();
    if (!needsMigration) return;
    const statements = await loadMigrationStatements();
    for (const stmt of statements) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (error) {
        console.warn("[Database] Migration statement failed:", error);
      }
    }

    try {
      if (_pool) {
        const [rows] = await _pool.query("SELECT DATABASE() AS db");
        const dbName =
          Array.isArray(rows) && rows.length > 0
            ? (rows[0] as any).db
            : null;
        if (dbName) {
          await _pool.query(
            `ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          );
        }
        for (const table of REQUIRED_TABLES) {
          try {
            await _pool.query(
              `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
          } catch (error) {
            console.warn(`[Database] Failed to convert ${table} to utf8mb4:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("[Database] Failed to enforce utf8mb4:", error);
    }
  })();
  return _autoMigrate;
}

async function buildAdminSnapshot(): Promise<AdminSnapshotData | null> {
  const db = await getDb();
  if (!db) return null;

  const [
    siteContentRows,
    siteImagesRows,
    portfolioRows,
    sectionsRows,
    packagesRows,
    testimonialsRows,
    contactRows,
  ] = await Promise.all([
    db.select().from(siteContent).orderBy(asc(siteContent.key)),
    db
      .select()
      .from(siteImages)
      .orderBy(asc(siteImages.sortOrder), asc(siteImages.id)),
    db
      .select()
      .from(portfolioImages)
      .orderBy(asc(portfolioImages.sortOrder), asc(portfolioImages.id)),
    db
      .select()
      .from(siteSections)
      .orderBy(asc(siteSections.sortOrder), asc(siteSections.id)),
    db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id)),
    db
      .select()
      .from(testimonials)
      .orderBy(asc(testimonials.sortOrder), asc(testimonials.id)),
    db.select().from(contactInfo).orderBy(asc(contactInfo.key)),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    siteContent: siteContentRows,
    siteImages: siteImagesRows,
    portfolioImages: portfolioRows,
    siteSections: sectionsRows,
    packages: packagesRows,
    testimonials: testimonialsRows,
    contactInfo: contactRows,
  };
}

function scheduleAdminSnapshot() {
  queueAdminSnapshot(buildAdminSnapshot);
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      if (!_pool) {
        _pool = mysql.createPool(ENV.databaseUrl);
      }
      _db = drizzle(_pool);
      await runAutoMigrate(_db);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Site Content Functions
// ============================================

export async function getAllSiteContent() {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "site-content.json",
      [] as SiteContent[]
    );
    if (snapshot.length) return snapshot;
    return await listLocalSiteContent();
  }
  return await db.select().from(siteContent);
}

export async function getSiteContentByKey(key: string) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "site-content.json",
      [] as SiteContent[]
    );
    const match = snapshot.find((item) => item.key === key);
    if (match) return match;
    return await getLocalSiteContentByKey(key);
  }
  const result = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSiteContent(data: InsertSiteContent) {
  const db = await getDb();
  if (!db) return await upsertLocalSiteContent(data);
  
  await db.insert(siteContent).values(data).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label, category: data.category },
  });
  
  const record = await getSiteContentByKey(data.key);
  scheduleAdminSnapshot();
  return record;
}

export async function deleteSiteContent(key: string) {
  const db = await getDb();
  if (!db) return await deleteLocalSiteContent(key);
  await db.delete(siteContent).where(eq(siteContent.key, key));
  scheduleAdminSnapshot();
  return true;
}

// ============================================
// Site Images Functions
// ============================================

export async function getAllSiteImages() {
  const db = await getDb();
  if (!db) {
    return await readAdminSnapshotFile(
      "site-images.json",
      [] as SiteImage[]
    );
  }
  return await db.select().from(siteImages).orderBy(asc(siteImages.sortOrder));
}

export async function getSiteImageByKey(key: string) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "site-images.json",
      [] as SiteImage[]
    );
    const match = snapshot.find((item) => item.key === key);
    return match ?? null;
  }
  const result = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSiteImage(data: InsertSiteImage) {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(siteImages).values(data).onDuplicateKeyUpdate({
    set: { url: data.url, alt: data.alt, category: data.category, sortOrder: data.sortOrder },
  });
  
  const record = await getSiteImageByKey(data.key);
  scheduleAdminSnapshot();
  return record;
}

export async function deleteSiteImage(key: string) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(siteImages).where(eq(siteImages.key, key));
  scheduleAdminSnapshot();
  return true;
}

// ============================================
// Share Links Functions
// ============================================

type ShareLinkRecord = {
  code: string;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

export async function createShareLinkRecord(data: InsertShareLink): Promise<ShareLinkRecord | null> {
  const db = await getDb();
  if (!db) {
    return await createLocalShareLink(data);
  }
  const existing = await getShareLinkByCode(data.code);
  if (existing) return null;

  await db.insert(shareLinks).values(data);

  return await getShareLinkByCode(data.code);
}

export async function getShareLinkByCode(code: string): Promise<ShareLinkRecord | null> {
  const db = await getDb();
  if (!db) {
    return await getLocalShareLinkByCode(code);
  }
  const result = await db.select().from(shareLinks).where(eq(shareLinks.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function listShareLinks(): Promise<ShareLinkRecord[]> {
  const db = await getDb();
  if (!db) {
    return await listLocalShareLinks();
  }
  return await db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt));
}

export async function revokeShareLink(code: string) {
  const db = await getDb();
  if (!db) {
    return await revokeLocalShareLink(code);
  }
  const now = new Date();
  await db.update(shareLinks).set({ revokedAt: now }).where(eq(shareLinks.code, code));
  return true;
}

export async function extendShareLink(code: string, hours: number): Promise<ShareLinkRecord | null> {
  const record = await getShareLinkByCode(code);
  if (!record) return null;
  if (!record.expiresAt) return null;
  const now = new Date();
  const base = record.expiresAt && record.expiresAt.getTime() > now.getTime()
    ? record.expiresAt
    : now;
  const newExpiresAt = new Date(base.getTime() + hours * 60 * 60 * 1000);

  const db = await getDb();
  if (!db) {
    return await extendLocalShareLink(code, newExpiresAt);
  }

  await db.update(shareLinks).set({ expiresAt: newExpiresAt }).where(eq(shareLinks.code, code));
  return {
    ...record,
    expiresAt: newExpiresAt,
  };
}

// ============================================
// Portfolio Images Functions
// ============================================

export async function getAllPortfolioImages() {
  const db = await getDb();
  if (!db) {
    return await readAdminSnapshotFile(
      "portfolio-images.json",
      [] as PortfolioImage[]
    );
  }
  return await db.select().from(portfolioImages).orderBy(asc(portfolioImages.sortOrder));
}

export async function getPortfolioImageById(id: number) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "portfolio-images.json",
      [] as PortfolioImage[]
    );
    const match = snapshot.find((item) => item.id === id);
    return match ?? null;
  }
  const result = await db.select().from(portfolioImages).where(eq(portfolioImages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPortfolioImage(data: InsertPortfolioImage) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(portfolioImages).values(data);
  const insertId = result[0].insertId;
  const record = await getPortfolioImageById(insertId);
  scheduleAdminSnapshot();
  return record;
}

export async function updatePortfolioImage(id: number, data: Partial<InsertPortfolioImage>) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(portfolioImages).set(data).where(eq(portfolioImages.id, id));
  const record = await getPortfolioImageById(id);
  scheduleAdminSnapshot();
  return record;
}

export async function deletePortfolioImage(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(portfolioImages).where(eq(portfolioImages.id, id));
  scheduleAdminSnapshot();
  return true;
}

// ============================================
// Site Sections Functions
// ============================================

export async function getAllSiteSections() {
  const db = await getDb();
  if (!db) {
    return await readAdminSnapshotFile(
      "site-sections.json",
      [] as SiteSection[]
    );
  }
  return await db.select().from(siteSections).orderBy(asc(siteSections.sortOrder));
}

export async function getSiteSectionByKey(key: string) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "site-sections.json",
      [] as SiteSection[]
    );
    const match = snapshot.find((item) => item.key === key);
    return match ?? null;
  }
  const result = await db.select().from(siteSections).where(eq(siteSections.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSiteSection(data: InsertSiteSection) {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(siteSections).values(data).onDuplicateKeyUpdate({
    set: { name: data.name, visible: data.visible, sortOrder: data.sortOrder, page: data.page },
  });
  
  const record = await getSiteSectionByKey(data.key);
  scheduleAdminSnapshot();
  return record;
}

export async function updateSiteSectionVisibility(key: string, visible: boolean) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(siteSections).set({ visible }).where(eq(siteSections.key, key));
  const record = await getSiteSectionByKey(key);
  scheduleAdminSnapshot();
  return record;
}

// ============================================
// Packages Functions
// ============================================

export async function getAllPackages() {
  const db = await getDb();
  if (!db) {
    return await readAdminSnapshotFile(
      "packages.json",
      [] as Package[]
    );
  }
  return await db.select().from(packages).orderBy(asc(packages.sortOrder));
}

export async function getPackageById(id: number) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "packages.json",
      [] as Package[]
    );
    const match = snapshot.find((item) => item.id === id);
    return match ?? null;
  }
  const result = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPackage(data: InsertPackage) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(packages).values(data);
  const insertId = result[0].insertId;
  const record = await getPackageById(insertId);
  scheduleAdminSnapshot();
  return record;
}

export async function updatePackage(id: number, data: Partial<InsertPackage>) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(packages).set(data).where(eq(packages.id, id));
  const record = await getPackageById(id);
  scheduleAdminSnapshot();
  return record;
}

export async function deletePackage(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(packages).where(eq(packages.id, id));
  scheduleAdminSnapshot();
  return true;
}

// ============================================
// Testimonials Functions
// ============================================

export async function getAllTestimonials() {
  const db = await getDb();
  if (!db) {
    return await readAdminSnapshotFile(
      "testimonials.json",
      [] as Testimonial[]
    );
  }
  return await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
}

export async function getTestimonialById(id: number) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "testimonials.json",
      [] as Testimonial[]
    );
    const match = snapshot.find((item) => item.id === id);
    return match ?? null;
  }
  const result = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTestimonial(data: InsertTestimonial) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(testimonials).values(data);
  const insertId = result[0].insertId;
  const record = await getTestimonialById(insertId);
  scheduleAdminSnapshot();
  return record;
}

export async function updateTestimonial(id: number, data: Partial<InsertTestimonial>) {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(testimonials).set(data).where(eq(testimonials.id, id));
  const record = await getTestimonialById(id);
  scheduleAdminSnapshot();
  return record;
}

export async function deleteTestimonial(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(testimonials).where(eq(testimonials.id, id));
  scheduleAdminSnapshot();
  return true;
}

// ============================================
// Contact Info Functions
// ============================================

export async function getAllContactInfo() {
  const db = await getDb();
  if (!db) {
    return await readAdminSnapshotFile(
      "contact-info.json",
      [] as ContactInfo[]
    );
  }
  return await db.select().from(contactInfo);
}

export async function getContactInfoByKey(key: string) {
  const db = await getDb();
  if (!db) {
    const snapshot = await readAdminSnapshotFile(
      "contact-info.json",
      [] as ContactInfo[]
    );
    const match = snapshot.find((item) => item.key === key);
    return match ?? null;
  }
  const result = await db.select().from(contactInfo).where(eq(contactInfo.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertContactInfo(data: InsertContactInfo) {
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(contactInfo).values(data).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label },
  });
  
  const record = await getContactInfoByKey(data.key);
  scheduleAdminSnapshot();
  return record;
}
