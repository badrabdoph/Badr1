import { eq, asc, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import type { Pool } from "mysql2";
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
import { ENV } from './_core/env';
import {
  createLocalShareLink,
  getLocalShareLinkByCode,
  listLocalShareLinks,
  revokeLocalShareLink,
  extendLocalShareLink,
} from "./_core/shareLinkStore";
import {
  getLocalSiteContentByKey,
  listLocalSiteContent,
  upsertLocalSiteContent,
  deleteLocalSiteContent,
} from "./_core/siteContentStore";
import {
  listFileSiteImages,
  getFileSiteImageByKey,
  upsertFileSiteImage,
  deleteFileSiteImage,
  listFilePortfolioImages,
  getFilePortfolioImageById,
  createFilePortfolioImage,
  updateFilePortfolioImage,
  deleteFilePortfolioImage,
  listFileSiteSections,
  getFileSiteSectionByKey,
  upsertFileSiteSection,
  updateFileSiteSectionVisibility,
  listFilePackages,
  getFilePackageById,
  createFilePackage,
  updateFilePackage,
  deleteFilePackage,
  listFileTestimonials,
  getFileTestimonialById,
  createFileTestimonial,
  updateFileTestimonial,
  deleteFileTestimonial,
  listFileContactInfo,
  getFileContactInfoByKey,
  upsertFileContactInfo,
} from "./_core/adminFileStore";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
const STORE_MODE = process.env.ADMIN_STORE_MODE ?? "file";
const useFileStore = STORE_MODE === "file";

type Positionable = {
  offsetX?: number | null;
  offsetY?: number | null;
};

function stripPositionFields<T extends Record<string, any>>(data: T): Omit<T, "offsetX" | "offsetY"> {
  if (!data) return data as Omit<T, "offsetX" | "offsetY">;
  const { offsetX, offsetY, ...rest } = data;
  return rest as Omit<T, "offsetX" | "offsetY">;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      if (!_pool) {
        _pool = mysql.createPool(ENV.databaseUrl);
      }
      _db = drizzle(_pool);
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
  if (useFileStore) return await listLocalSiteContent();
  const db = await getDb();
  if (!db) return await listLocalSiteContent();
  return await db.select().from(siteContent);
}

export async function getSiteContentByKey(key: string) {
  if (useFileStore) return await getLocalSiteContentByKey(key);
  const db = await getDb();
  if (!db) return await getLocalSiteContentByKey(key);
  const result = await db.select().from(siteContent).where(eq(siteContent.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSiteContent(data: InsertSiteContent & Positionable) {
  if (useFileStore) return await upsertLocalSiteContent(data);
  const db = await getDb();
  if (!db) return await upsertLocalSiteContent(data);

  const dbData = stripPositionFields(data);
  await db.insert(siteContent).values(dbData).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label, category: data.category },
  });
  
  return await getSiteContentByKey(data.key);
}

export async function deleteSiteContent(key: string) {
  if (useFileStore) return await deleteLocalSiteContent(key);
  const db = await getDb();
  if (!db) return await deleteLocalSiteContent(key);
  await db.delete(siteContent).where(eq(siteContent.key, key));
  return true;
}

// ============================================
// Site Images Functions
// ============================================

export async function getAllSiteImages() {
  if (useFileStore) return await listFileSiteImages();
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(siteImages).orderBy(asc(siteImages.sortOrder));
}

export async function getSiteImageByKey(key: string) {
  if (useFileStore) return await getFileSiteImageByKey(key);
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteImages).where(eq(siteImages.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSiteImage(data: InsertSiteImage & Positionable) {
  if (useFileStore) return await upsertFileSiteImage(data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  await db.insert(siteImages).values(dbData).onDuplicateKeyUpdate({
    set: { url: data.url, alt: data.alt, category: data.category, sortOrder: data.sortOrder },
  });
  
  return await getSiteImageByKey(data.key);
}

export async function deleteSiteImage(key: string) {
  if (useFileStore) return await deleteFileSiteImage(key);
  const db = await getDb();
  if (!db) return false;
  await db.delete(siteImages).where(eq(siteImages.key, key));
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
  if (useFileStore) return await createLocalShareLink(data);
  const db = await getDb();
  if (!db) return await createLocalShareLink(data);
  const existing = await getShareLinkByCode(data.code);
  if (existing) return null;

  await db.insert(shareLinks).values(data);

  return await getShareLinkByCode(data.code);
}

export async function getShareLinkByCode(code: string): Promise<ShareLinkRecord | null> {
  if (useFileStore) return await getLocalShareLinkByCode(code);
  const db = await getDb();
  if (!db) return await getLocalShareLinkByCode(code);
  const result = await db.select().from(shareLinks).where(eq(shareLinks.code, code)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function listShareLinks(): Promise<ShareLinkRecord[]> {
  if (useFileStore) return await listLocalShareLinks();
  const db = await getDb();
  if (!db) return await listLocalShareLinks();
  return await db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt));
}

export async function revokeShareLink(code: string) {
  if (useFileStore) return await revokeLocalShareLink(code);
  const db = await getDb();
  if (!db) return await revokeLocalShareLink(code);
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

  if (useFileStore) return await extendLocalShareLink(code, newExpiresAt);
  const db = await getDb();
  if (!db) return await extendLocalShareLink(code, newExpiresAt);

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
  if (useFileStore) return await listFilePortfolioImages();
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(portfolioImages).orderBy(asc(portfolioImages.sortOrder));
}

export async function getPortfolioImageById(id: number) {
  if (useFileStore) return await getFilePortfolioImageById(id);
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(portfolioImages).where(eq(portfolioImages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPortfolioImage(data: InsertPortfolioImage & Positionable) {
  if (useFileStore) return await createFilePortfolioImage(data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  const result = await db.insert(portfolioImages).values(dbData);
  const insertId = result[0].insertId;
  return await getPortfolioImageById(insertId);
}

export async function updatePortfolioImage(
  id: number,
  data: Partial<InsertPortfolioImage> & Positionable
) {
  if (useFileStore) return await updateFilePortfolioImage(id, data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  await db.update(portfolioImages).set(dbData).where(eq(portfolioImages.id, id));
  return await getPortfolioImageById(id);
}

export async function deletePortfolioImage(id: number) {
  if (useFileStore) return await deleteFilePortfolioImage(id);
  const db = await getDb();
  if (!db) return false;
  await db.delete(portfolioImages).where(eq(portfolioImages.id, id));
  return true;
}

// ============================================
// Site Sections Functions
// ============================================

export async function getAllSiteSections() {
  if (useFileStore) return await listFileSiteSections();
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(siteSections).orderBy(asc(siteSections.sortOrder));
}

export async function getSiteSectionByKey(key: string) {
  if (useFileStore) return await getFileSiteSectionByKey(key);
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(siteSections).where(eq(siteSections.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSiteSection(data: InsertSiteSection) {
  if (useFileStore) return await upsertFileSiteSection(data);
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(siteSections).values(data).onDuplicateKeyUpdate({
    set: { name: data.name, visible: data.visible, sortOrder: data.sortOrder, page: data.page },
  });
  
  return await getSiteSectionByKey(data.key);
}

export async function updateSiteSectionVisibility(key: string, visible: boolean) {
  if (useFileStore) return await updateFileSiteSectionVisibility(key, visible);
  const db = await getDb();
  if (!db) return null;
  
  await db.update(siteSections).set({ visible }).where(eq(siteSections.key, key));
  return await getSiteSectionByKey(key);
}

// ============================================
// Packages Functions
// ============================================

export async function getAllPackages() {
  if (useFileStore) return await listFilePackages();
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(packages).orderBy(asc(packages.sortOrder));
}

export async function getPackageById(id: number) {
  if (useFileStore) return await getFilePackageById(id);
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(packages).where(eq(packages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPackage(data: InsertPackage & Positionable) {
  if (useFileStore) return await createFilePackage(data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  const result = await db.insert(packages).values(dbData);
  const insertId = result[0].insertId;
  return await getPackageById(insertId);
}

export async function updatePackage(
  id: number,
  data: Partial<InsertPackage> & Positionable
) {
  if (useFileStore) return await updateFilePackage(id, data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  await db.update(packages).set(dbData).where(eq(packages.id, id));
  return await getPackageById(id);
}

export async function deletePackage(id: number) {
  if (useFileStore) return await deleteFilePackage(id);
  const db = await getDb();
  if (!db) return false;
  await db.delete(packages).where(eq(packages.id, id));
  return true;
}

// ============================================
// Testimonials Functions
// ============================================

export async function getAllTestimonials() {
  if (useFileStore) return await listFileTestimonials();
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder));
}

export async function getTestimonialById(id: number) {
  if (useFileStore) return await getFileTestimonialById(id);
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTestimonial(data: InsertTestimonial & Positionable) {
  if (useFileStore) return await createFileTestimonial(data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  const result = await db.insert(testimonials).values(dbData);
  const insertId = result[0].insertId;
  return await getTestimonialById(insertId);
}

export async function updateTestimonial(
  id: number,
  data: Partial<InsertTestimonial> & Positionable
) {
  if (useFileStore) return await updateFileTestimonial(id, data);
  const db = await getDb();
  if (!db) return null;

  const dbData = stripPositionFields(data);
  await db.update(testimonials).set(dbData).where(eq(testimonials.id, id));
  return await getTestimonialById(id);
}

export async function deleteTestimonial(id: number) {
  if (useFileStore) return await deleteFileTestimonial(id);
  const db = await getDb();
  if (!db) return false;
  await db.delete(testimonials).where(eq(testimonials.id, id));
  return true;
}

// ============================================
// Contact Info Functions
// ============================================

export async function getAllContactInfo() {
  if (useFileStore) return await listFileContactInfo();
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contactInfo);
}

export async function getContactInfoByKey(key: string) {
  if (useFileStore) return await getFileContactInfoByKey(key);
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contactInfo).where(eq(contactInfo.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertContactInfo(data: InsertContactInfo) {
  if (useFileStore) return await upsertFileContactInfo(data);
  const db = await getDb();
  if (!db) return null;
  
  await db.insert(contactInfo).values(data).onDuplicateKeyUpdate({
    set: { value: data.value, label: data.label },
  });
  
  return await getContactInfoByKey(data.key);
}
