import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { settingsDb, albumDb, photoDb, selectionDb } from "./supabaseDb.js";
import { authMiddleware, AuthenticatedRequest } from "./authMiddleware.js";
import { getBucketSize, syncDatabaseToSupabase } from "./supabaseSync.js";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const BRAND_DIR = path.join(UPLOADS_DIR, "brand");

if (!fs.existsSync(BRAND_DIR)) {
  fs.mkdirSync(BRAND_DIR, { recursive: true });
}

// Multer config for branding upload
const brandStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, BRAND_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === "logo" ? "logo" : "favicon";
    cb(null, `${prefix}-${Date.now()}${ext}`);
  },
});

const uploadBrand = multer({
  storage: brandStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// 1. Get settings
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id || "default";
    const settings = await settingsDb.get(userId);
    res.json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch settings." });
  }
});

// 2. Update settings
router.put("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, ...data } = req.body;

    const booleanFields = [
      "darkMode", "lightMode", "infiniteScroll", "watermarkEnabled", 
      "downloadEnabled", "fullscreenEnabled", "zoomEnabled", 
      "passwordProtection", "linkExpiryEnabled", "allowReselection", 
      "showSelectionCounter", "allowComments", "showPhotographerContact", 
      "autoThumbnail", "twoFactorEnabled", "emailNotification", 
      "whatsAppNotification", "browserNotification"
    ];

    const sanitizedData: any = { ...data };
    for (const field of booleanFields) {
      if (sanitizedData[field] !== undefined) {
        sanitizedData[field] = String(sanitizedData[field]) === "true" || sanitizedData[field] === true;
      }
    }

    const numberFields = ["gridColumns", "maxSelectionLimit", "maxUploadSize", "compressionLevel", "sessionTimeout", "expiryDays", "gracePeriodDays"];
    for (const field of numberFields) {
      if (sanitizedData[field] !== undefined) {
        sanitizedData[field] = parseInt(sanitizedData[field], 10) || 0;
      }
    }

    if (sanitizedData.extendedSettings && typeof sanitizedData.extendedSettings === "object") {
      sanitizedData.extendedSettings = JSON.stringify(sanitizedData.extendedSettings);
    }

    const userId = req.user?.id || "default";
    const updated = await settingsDb.update(sanitizedData, userId);

    res.json({ settings: updated, message: "Settings Saved Successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update settings." });
  }
});

// 3. Brand uploads
router.post(
  "/upload",
  authMiddleware,
  uploadBrand.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const updateData: any = {};

      if (files?.logo?.[0]) {
        updateData.logoUrl = `/uploads/brand/${files.logo[0].filename}`;
        updateData.studioLogo = `/uploads/brand/${files.logo[0].filename}`;
      }
      if (files?.favicon?.[0]) {
        updateData.favicon = `/uploads/brand/${files.favicon[0].filename}`;
      }

      const updated = await settingsDb.update(updateData);

      res.json({
        settings: updated,
        message: "Branding elements uploaded successfully.",
        logoUrl: updateData.logoUrl,
        faviconUrl: updateData.favicon,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to upload branding element." });
    }
  }
);

// 4. Statistics (Storage, photos, albums)
router.get("/stats", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalAlbums = await albumDb.count();
    const totalPhotos = await photoDb.count();
    const totalSelectedPhotos = await selectionDb.count();

    const originalImageSize = await getBucketSize("original-images");
    const thumbnailSize = await getBucketSize("thumbnails");
    const databaseSize = await syncDatabaseToSupabase();

    const storageUsed = originalImageSize + thumbnailSize + databaseSize;
    const storageLimit = Number(process.env.STORAGE_LIMIT) || 10 * 1024 * 1024 * 1024;
    const remainingStorage = Math.max(0, storageLimit - storageUsed);
    const storagePercentage = parseFloat(Math.min(100, (storageUsed / storageLimit) * 100).toFixed(2));

    res.json({
      totalAlbums,
      totalPhotos,
      totalSelectedPhotos,
      originalImageSize,
      thumbnailSize,
      databaseSize,
      storageUsed,
      storageLimit,
      remainingStorage,
      storagePercentage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load database stats." });
  }
});

// 5. Backup Export Settings
router.get("/backup/export", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await settingsDb.get();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to export settings." });
  }
});

// 6. Backup Import Settings
router.post("/backup/import", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const importedSettings = req.body;
    if (!importedSettings || typeof importedSettings !== "object") {
      res.status(400).json({ error: "Invalid backup data format." });
      return;
    }

    delete importedSettings.id;
    const updated = await settingsDb.update(importedSettings);

    res.json({ settings: updated, message: "Settings restored from backup successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to import settings." });
  }
});

export default router;
