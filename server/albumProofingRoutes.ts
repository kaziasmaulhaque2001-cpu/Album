import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { albumProofingDb, normalizePageType } from "./albumProofingDb.js";
import { ProofingSide, ProofingStatus, SpreadType } from "../src/types/proofing.js";
import { isSupabaseConfigured, supabaseClient, formatSupabaseUrl } from "./supabase.js";

const router = express.Router();

// GET /api/proofing/upload-config - Returns Supabase client upload configuration
router.get("/upload-config", (req, res) => {
  const url = formatSupabaseUrl(process.env.SUPABASE_URL);
  res.json({
    isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? url : "",
    supabaseAnonKey: isSupabaseConfigured ? (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "") : "",
    bucketName: "album-photos",
  });
});

const PROOFING_UPLOADS = path.join(process.cwd(), "uploads", "proofing");
if (!fs.existsSync(PROOFING_UPLOADS)) {
  fs.mkdirSync(PROOFING_UPLOADS, { recursive: true });
}

async function processProofingImage(albumId: string, file: Express.Multer.File) {
  const filePath = file.path;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new Error(`File ${file.originalname} failed to write to storage.`);
  }

  const albumDir = path.join(PROOFING_UPLOADS, albumId);
  const thumbsDir = path.join(albumDir, "thumbs");
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  const thumbPath = path.join(thumbsDir, file.filename);

  // Generate thumbnail with sharp immediately
  try {
    await sharp(filePath)
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
  } catch (err) {
    console.warn("Sharp thumbnail generation fallback for", file.filename, err);
    fs.copyFileSync(filePath, thumbPath);
  }

  let fileUrl = `/uploads/proofing/${albumId}/${file.filename}`;
  let thumbnailUrl = `/uploads/proofing/${albumId}/thumbs/${file.filename}`;

  // Supabase Storage upload if configured
  if (isSupabaseConfigured && supabaseClient) {
    try {
      const origBuffer = fs.readFileSync(filePath);
      const { error: origErr } = await supabaseClient.storage
        .from("proofing-images")
        .upload(`${albumId}/${file.filename}`, origBuffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (!origErr) {
        const { data: origData } = supabaseClient.storage
          .from("proofing-images")
          .getPublicUrl(`${albumId}/${file.filename}`);
        if (origData?.publicUrl) {
          fileUrl = origData.publicUrl;
        }
      }

      const thumbBuffer = fs.readFileSync(thumbPath);
      const { error: thumbErr } = await supabaseClient.storage
        .from("proofing-thumbnails")
        .upload(`${albumId}/${file.filename}`, thumbBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (!thumbErr) {
        const { data: thumbData } = supabaseClient.storage
          .from("proofing-thumbnails")
          .getPublicUrl(`${albumId}/${file.filename}`);
        if (thumbData?.publicUrl) {
          thumbnailUrl = thumbData.publicUrl;
        }
      }
    } catch (sErr: any) {
      console.warn("Supabase proofing upload warning:", sErr.message);
    }
  }

  return { fileUrl, thumbnailUrl };
}

// Multer storage for image spreads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const albumId = req.params.albumId || "common";
    const dir = path.join(PROOFING_UPLOADS, albumId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}_${cleanName}`);
  }
});

// Filter to support strictly JPG, JPEG, PNG, WEBP (No PDF)
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file format. Only JPG, JPEG, PNG, and WEBP image spreads are supported."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB per spread image
});

// GET /api/proofing/list - Summaries for all albums
router.get("/list", async (req, res) => {
  try {
    // Read local store directly or list keys
    const store = await albumProofingDb.getProofingData("list_placeholder");
    res.json({ success: true, store });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to load proofing list" });
  }
});

// GET /api/proofing/:albumId - Full proofing dataset
router.get("/:albumId", async (req, res) => {
  try {
    const { albumId } = req.params;
    const data = await albumProofingDb.getProofingData(albumId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to retrieve proofing data" });
  }
});

// POST /api/proofing/:albumId/upload - Upload single or multiple spread images
router.post("/:albumId/upload", upload.array("files", 100), async (req, res) => {
  try {
    const { albumId } = req.params;
    const side: ProofingSide = (req.body.side as ProofingSide) || "BRIDE";
    const rawType = req.body.pageType || req.body.spreadType || "spread";
    const pageType = normalizePageType(rawType);

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "No image files were uploaded." });
    }

    let updatedData;
    for (const file of files) {
      const { fileUrl, thumbnailUrl } = await processProofingImage(albumId, file);

      const newSpread = {
        id: `spread-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pageType: pageType,
        type: pageType as SpreadType,
        spreadNumber: 1,
        title: file.originalname.replace(/\.[^/.]+$/, ""),
        filename: file.filename,
        url: fileUrl,
        thumbnailUrl: thumbnailUrl,
        size: file.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      updatedData = await albumProofingDb.addSpread(albumId, side, newSpread);
    }

    res.json({ success: true, data: updatedData, message: `Successfully uploaded ${files.length} spread(s).` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Upload failed. Please try again." });
  }
});

// POST /api/proofing/:albumId/spreads - Update spread order / list
router.post("/:albumId/spreads", async (req, res) => {
  try {
    const { albumId } = req.params;
    const { side, versionId, spreads } = req.body;
    const updated = await albumProofingDb.updateSpreads(albumId, side, versionId, spreads);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to update page order." });
  }
});

// PUT /api/proofing/:albumId/spreads/:spreadId - Replace or update spread info
router.put("/:albumId/spreads/:spreadId", upload.single("file"), async (req, res) => {
  try {
    const { albumId, spreadId } = req.params;
    const { side, versionId, title, type } = req.body;

    let updates: any = {};
    if (title) updates.title = title;
    if (type) updates.type = type;

    if (req.file) {
      const { fileUrl, thumbnailUrl } = await processProofingImage(albumId, req.file);
      updates.url = fileUrl;
      updates.thumbnailUrl = thumbnailUrl;
      updates.filename = req.file.filename;
      updates.size = req.file.size;
    }

    const updated = await albumProofingDb.replaceSpread(albumId, side, versionId, spreadId, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to replace spread." });
  }
});

// DELETE /api/proofing/:albumId/spreads/:spreadId - Delete spread
router.delete("/:albumId/spreads/:spreadId", async (req, res) => {
  try {
    const { albumId, spreadId } = req.params;
    const { side, versionId } = req.query as { side: ProofingSide; versionId: string };
    const updated = await albumProofingDb.deleteSpread(albumId, side, versionId, spreadId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to delete spread." });
  }
});

// POST /api/proofing/:albumId/spreads/:spreadId/duplicate - Duplicate spread
router.post("/:albumId/spreads/:spreadId/duplicate", async (req, res) => {
  try {
    const { albumId, spreadId } = req.params;
    const { side, versionId } = req.body;
    const updated = await albumProofingDb.duplicateSpread(albumId, side, versionId, spreadId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to duplicate spread." });
  }
});

// POST /api/proofing/:albumId/versions - Create a new version
router.post("/:albumId/versions", async (req, res) => {
  try {
    const { albumId } = req.params;
    const { side, notes } = req.body;
    const updated = await albumProofingDb.createNewVersion(albumId, side, notes);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to create new version." });
  }
});

// POST /api/proofing/:albumId/versions/:versionId/publish - Publish version
router.post("/:albumId/versions/:versionId/publish", async (req, res) => {
  try {
    const { albumId, versionId } = req.params;
    const { side } = req.body;
    const updated = await albumProofingDb.publishVersion(albumId, side, versionId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to publish version." });
  }
});

// POST /api/proofing/:albumId/versions/:versionId/restore - Restore version
router.post("/:albumId/versions/:versionId/restore", async (req, res) => {
  try {
    const { albumId, versionId } = req.params;
    const { side } = req.body;
    const updated = await albumProofingDb.restoreVersion(albumId, side, versionId);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to restore version." });
  }
});

// PATCH /api/proofing/:albumId/status - Update album proofing status
router.patch("/:albumId/status", async (req, res) => {
  try {
    const { albumId } = req.params;
    const { side, status } = req.body as { side: ProofingSide; status: ProofingStatus };
    const updated = await albumProofingDb.updateStatus(albumId, side, status);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to update status." });
  }
});

// POST /api/proofing/:albumId/comments - Add comment (with optional screenshot attachment)
router.post("/:albumId/comments", upload.single("attachment"), async (req, res) => {
  try {
    const { albumId } = req.params;
    const { spreadId, spreadNumber, spreadTitle, side, versionNumber, author, authorRole, text, pinX, pinY } = req.body;

    let attachmentUrl = "";
    if (req.file) {
      const host = req.get("host") || "localhost:3000";
      const protocol = req.protocol || "http";
      attachmentUrl = `${protocol}://${host}/uploads/proofing/${albumId}/${req.file.filename}`;
    }

    const updated = await albumProofingDb.addComment(albumId, {
      albumId,
      spreadId,
      spreadNumber: spreadNumber ? Number(spreadNumber) : undefined,
      spreadTitle,
      side: side || "BRIDE",
      versionNumber: versionNumber ? Number(versionNumber) : 1,
      author: author || "Client",
      authorRole: authorRole || "Client",
      text: text || "",
      pinX: pinX ? Number(pinX) : undefined,
      pinY: pinY ? Number(pinY) : undefined,
      attachmentUrl: attachmentUrl || undefined,
      status: "Pending"
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to submit comment." });
  }
});

// PATCH /api/proofing/:albumId/comments/:commentId - Resolve / Reply comment
router.patch("/:albumId/comments/:commentId", async (req, res) => {
  try {
    const { albumId, commentId } = req.params;
    const { status, designerReply } = req.body;
    const updated = await albumProofingDb.updateComment(albumId, commentId, { status, designerReply });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to update comment." });
  }
});

// PUT /api/proofing/:albumId/settings - Update settings
router.put("/:albumId/settings", async (req, res) => {
  try {
    const { albumId } = req.params;
    const updated = await albumProofingDb.updateSettings(albumId, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to save settings." });
  }
});

// POST /api/proofing/:albumId/activity - Log custom client activity (View, Favorite, etc.)
router.post("/:albumId/activity", async (req, res) => {
  try {
    const { albumId } = req.params;
    const { side, type, description, user } = req.body;
    const updated = await albumProofingDb.logActivity(
      albumId,
      side || "BRIDE",
      type || "View",
      description || "Client viewed album",
      user || "Client"
    );
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to log activity." });
  }
});

export default router;
