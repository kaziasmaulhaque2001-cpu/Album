import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { albumDb, folderDb, photoDb, selectionDb, settingsDb, adminNotificationDb, deletedAlbumDb } from "./supabaseDb.js";
import { albumProofingDb } from "./albumProofingDb.js";
import { authMiddleware, AuthenticatedRequest } from "./authMiddleware.js";
import { isSupabaseConfigured, supabaseClient } from "./supabase.js";
import { getFilenameFromUrl } from "./supabaseSync.js";
import { evaluateAlbumLifecycles, permanentlyDeleteAlbumInstance } from "./albumLifecycle.js";

const router = Router();

// Ensure uploads folder and subfolders exist
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const ORIGINAL_DIR = path.join(UPLOADS_DIR, "original");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(ORIGINAL_DIR)) {
  fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// Config Multer for storage (Original raw files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ORIGINAL_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit per image
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/i;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG, JPG, PNG, and WEBP image formats are allowed."));
  },
});

// Create Album
router.post("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const {
    brideName,
    groomName,
    weddingDate,
    eventName,
    description,
    coverUrl,
    password,
    expiryDate,
  } = req.body;

  if (!brideName || !groomName || !weddingDate || !eventName) {
    res.status(400).json({ error: "Bride Name, Groom Name, Wedding Date, and Event Type are required." });
    return;
  }

  try {
    const settings = await settingsDb.get();
    const expiryDays = settings.expiryDays ?? 30;

    const finalExpiryDate = expiryDate 
      ? new Date(expiryDate).toISOString()
      : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const album = await albumDb.create({
      brideName,
      groomName,
      weddingDate: new Date(weddingDate).toISOString(),
      eventName,
      description: description || "",
      coverUrl: coverUrl || null,
      password: password || null,
      expiryDate: finalExpiryDate,
      status: "ACTIVE",
      isActive: true,
    });

    res.status(201).json({ album });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create album." });
  }
});

// Get All Albums (Admin views)
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    const searchStr = search ? String(search) : undefined;

    const albums = await albumDb.findMany({ search: searchStr });

    res.json({ albums });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch albums." });
  }
});

// ADMIN ENDPOINT: Fetch all client selections across all albums
router.get("/all-client-selections", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const selections = await selectionDb.findAll();
    const photos = await photoDb.findAll();
    const albums = await albumDb.findMany();

    const photoMap = new Map(photos.map((p) => [p.id, p]));
    const albumMap = new Map(albums.map((a) => [a.id, a]));

    const grouped: Record<string, {
      key: string;
      albumId: string;
      albumName: string;
      clientEmail: string;
      clientName: string | null;
      selectionDate: Date;
      photos: any[];
    }> = {};

    selections.forEach((sel) => {
      const groupKey = `${sel.albumId}_${sel.clientEmail}`;
      const photo = photoMap.get(sel.photoId);
      const album = albumMap.get(sel.albumId);

      if (photo && album) {
        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            key: groupKey,
            albumId: sel.albumId,
            albumName: `${album.brideName} & ${album.groomName}`,
            clientEmail: sel.clientEmail,
            clientName: sel.clientName,
            selectionDate: new Date(sel.createdAt),
            photos: [],
          };
        }
        grouped[groupKey].photos.push(photo);
      }
    });

    res.json({ clientSelections: Object.values(grouped) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch all client selections." });
  }
});

// Get Specific Album details, photos & folders (Admin view)
router.get("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const album = await albumDb.findById(id);

    if (!album) {
      res.status(404).json({ error: "Album not found." });
      return;
    }

    const folders = await folderDb.findByAlbumId(id);

    res.json({ album, folders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch album." });
  }
});

// GET Album Folders
router.get("/:id/folders", async (req, res) => {
  const { id } = req.params;
  try {
    const folders = await folderDb.findByAlbumId(id);
    res.json({ folders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch folders." });
  }
});

// CREATE Album Folder
router.post("/:id/folders", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id: albumId } = req.params;
  const { name, side, coverUrl } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: "Folder name is required." });
    return;
  }

  try {
    const folder = await folderDb.create({ albumId, name: name.trim(), side, coverUrl });
    res.status(201).json({ folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create folder." });
  }
});

// REORDER Album Folders
router.patch("/:id/folders/reorder", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id: albumId } = req.params;
  const { folderOrders } = req.body;

  if (!Array.isArray(folderOrders)) {
    res.status(400).json({ error: "folderOrders array required." });
    return;
  }

  try {
    await folderDb.reorderBatch(albumId, folderOrders);
    res.json({ message: "Folders reordered successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to reorder folders." });
  }
});

// UPDATE Album Folder
router.patch("/:id/folders/:folderId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { folderId } = req.params;
  const { name, side, coverUrl, order } = req.body;

  try {
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (side !== undefined) updates.side = side.toUpperCase().includes("GROOM") ? "GROOM" : "BRIDE";
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;
    if (order !== undefined) updates.order = Number(order);

    const folder = await folderDb.update(folderId, updates);
    res.json({ folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update folder." });
  }
});

// DELETE Album Folder
router.delete("/:id/folders/:folderId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { folderId } = req.params;

  try {
    const folder = await folderDb.delete(folderId);
    res.json({ message: "Folder deleted successfully.", folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete folder." });
  }
});

// MOVE PHOTOS BETWEEN FOLDERS
router.patch("/:id/photos/move", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { photoIds, targetFolderId } = req.body;

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    res.status(400).json({ error: "photoIds array required." });
    return;
  }

  try {
    await photoDb.moveBatch(photoIds, targetFolderId || null);
    res.json({ message: `Successfully moved ${photoIds.length} photo(s).` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to move photos." });
  }
});

// Update Album
router.put("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    brideName,
    groomName,
    weddingDate,
    eventName,
    description,
    coverUrl,
    password,
    expiryDate,
    isActive,
  } = req.body;

  try {
    const existingAlbum = await albumDb.findById(id);
    if (!existingAlbum) {
      res.status(404).json({ error: "Album not found." });
      return;
    }

    const updates: any = {};
    if (brideName !== undefined) updates.brideName = brideName;
    if (groomName !== undefined) updates.groomName = groomName;
    if (weddingDate !== undefined) updates.weddingDate = new Date(weddingDate).toISOString();
    if (eventName !== undefined) updates.eventName = eventName;
    if (description !== undefined) updates.description = description;
    if (coverUrl !== undefined) updates.coverUrl = coverUrl;
    if (password !== undefined) updates.password = password;
    if (expiryDate !== undefined) updates.expiryDate = expiryDate ? new Date(expiryDate).toISOString() : null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const album = await albumDb.update(id, updates);

    res.json({ album });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update album." });
  }
});

// GET Album Lifecycle Stats and Data
router.get("/lifecycle/stats", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await settingsDb.get();
    const expiryDays = settings.expiryDays ?? 30;
    const gracePeriodDays = settings.gracePeriodDays ?? 7;

    const allAlbums = await albumDb.findMany();
    const deletedAlbums = await deletedAlbumDb.findMany();
    const notifications = await adminNotificationDb.findMany();

    const now = new Date();

    let activeAlbumsCount = 0;
    let expiredAlbumsCount = 0;
    let gracePeriodAlbumsCount = 0;
    let storageToFree = 0;

    const activeAlbums: any[] = [];
    const expiredAlbums: any[] = [];

    for (const album of allAlbums) {
      const expDate = album.expiryDate ? new Date(album.expiryDate) : null;
      const graceEndDate = expDate ? new Date(expDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000) : null;

      const photos = album.photos || [];
      const selections = album.selections || [];
      const size = photos.reduce((sum: number, p: any) => sum + (p.size || 0), 0);

      let daysRemaining = 0;
      let daysToDeletion = 0;

      if (expDate) {
        daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      if (graceEndDate) {
        daysToDeletion = Math.ceil((graceEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      const formatted = {
        ...album,
        photoCount: photos.length,
        selectionCount: selections.length,
        storageSize: size,
        daysRemaining,
        daysToDeletion,
      };

      if (album.status === "ACTIVE") {
        activeAlbumsCount++;
        activeAlbums.push(formatted);
      } else if (album.status === "EXPIRED" || album.status === "GRACE" || (expDate && now >= expDate)) {
        expiredAlbumsCount++;
        gracePeriodAlbumsCount++;
        storageToFree += size;
        expiredAlbums.push(formatted);
      } else if (album.status === "ARCHIVED") {
        activeAlbums.push(formatted);
      }
    }

    res.json({
      activeAlbumsCount,
      expiredAlbumsCount,
      gracePeriodAlbumsCount,
      deletedAlbumsCount: deletedAlbums.length,
      storageToFree,
      activeAlbums,
      expiredAlbums,
      deletedAlbums,
      notifications,
      expiryDays,
      gracePeriodDays,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load album lifecycle statistics." });
  }
});

// Trigger Manual Lifecycle Evaluation
router.post("/lifecycle/evaluate", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await evaluateAlbumLifecycles();
    res.json({ message: "Album lifecycle evaluation executed and completed successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to trigger manual lifecycle evaluation." });
  }
});

// Admin Route: Restore Album
router.post("/:id/lifecycle/restore", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const settings = await settingsDb.get();
    const expiryDays = settings.expiryDays ?? 30;

    const album = await albumDb.findById(id);
    if (!album) {
      res.status(404).json({ error: "Album not found." });
      return;
    }

    const newExpiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const updated = await albumDb.update(id, {
      status: "ACTIVE",
      isActive: true,
      expiryDate: newExpiryDate,
      statusChangedAt: new Date().toISOString(),
    });

    await adminNotificationDb.create({
      albumId: id,
      albumName: `${album.brideName} & ${album.groomName}`,
      type: "RESTORED",
      message: `Album "${album.brideName} & ${album.groomName}" was restored by the administrator. Expiry reset to ${new Date(newExpiryDate).toLocaleDateString()}.`,
    });

    res.json({ album: updated, message: "Album successfully restored to Active status." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to restore album." });
  }
});

// Admin Route: Extend Expiry
router.post("/:id/lifecycle/extend", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { days } = req.body;
  const daysToAdd = parseInt(days, 10) || 30;

  try {
    const album = await albumDb.findById(id);
    if (!album) {
      res.status(404).json({ error: "Album not found." });
      return;
    }

    const currentExpiry = album.expiryDate && new Date(album.expiryDate) > new Date()
      ? new Date(album.expiryDate)
      : new Date();

    const newExpiryDate = new Date(currentExpiry.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

    const updated = await albumDb.update(id, {
      status: "ACTIVE",
      isActive: true,
      expiryDate: newExpiryDate,
      statusChangedAt: new Date().toISOString(),
    });

    await adminNotificationDb.create({
      albumId: id,
      albumName: `${album.brideName} & ${album.groomName}`,
      type: "EXTENDED",
      message: `Album "${album.brideName} & ${album.groomName}" expiry date extended by ${daysToAdd} days (New Expiry: ${new Date(newExpiryDate).toLocaleDateString()}).`,
    });

    res.json({ album: updated, message: `Album expiry successfully extended by ${daysToAdd} days.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to extend album expiry." });
  }
});

// Admin Route: Archive Album
router.post("/:id/lifecycle/archive", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const album = await albumDb.findById(id);
    if (!album) {
      res.status(404).json({ error: "Album not found." });
      return;
    }

    const updated = await albumDb.update(id, {
      status: "ARCHIVED",
      isActive: false,
      statusChangedAt: new Date().toISOString(),
      archivedAt: new Date().toISOString(),
    });

    await adminNotificationDb.create({
      albumId: id,
      albumName: `${album.brideName} & ${album.groomName}`,
      type: "ARCHIVED",
      message: `Album "${album.brideName} & ${album.groomName}" was manually archived by the administrator.`,
    });

    res.json({ album: updated, message: "Album successfully archived." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to archive album." });
  }
});

// Admin Route: Mark Notification as Read
router.post("/lifecycle/notifications/:id/read", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await adminNotificationDb.markRead(id);
    res.json({ message: "Notification marked as read." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to mark notification as read." });
  }
});

// Delete Album
router.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const album = await albumDb.findById(id);

    if (!album) {
      res.status(404).json({ error: "Album not found." });
      return;
    }

    await permanentlyDeleteAlbumInstance(album);

    res.json({ message: "Album and all associated photos deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete album." });
  }
});

// Upload Single Photo to Album
router.post(
  "/:id/upload",
  authMiddleware,
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    const { id: albumId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No photo file provided." });
      return;
    }

    try {
      const album = await albumDb.findById(albumId);
      if (!album) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        res.status(404).json({ error: "Album not found." });
        return;
      }

      const originalPath = file.path;
      const thumbnailPath = path.join(THUMBNAILS_DIR, file.filename);
      try {
        await sharp(originalPath)
          .resize(800, 800, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .toFile(thumbnailPath);
      } catch (err) {
        fs.copyFileSync(originalPath, thumbnailPath);
      }

      let finalUrl = `/uploads/original/${file.filename}`;
      let finalThumbnailUrl = `/uploads/thumbnails/${file.filename}`;

      if (isSupabaseConfigured && supabaseClient) {
        try {
          const originalBuffer = fs.readFileSync(originalPath);
          const { error: origUploadError } = await supabaseClient.storage
            .from("original-images")
            .upload(file.filename, originalBuffer, {
              contentType: file.mimetype,
              upsert: true,
            });

          if (!origUploadError) {
            const { data: origUrlData } = supabaseClient.storage
              .from("original-images")
              .getPublicUrl(file.filename);
            if (origUrlData?.publicUrl) {
              finalUrl = origUrlData.publicUrl;
            }
          }

          const thumbnailBuffer = fs.readFileSync(thumbnailPath);
          const { error: thumbUploadError } = await supabaseClient.storage
            .from("thumbnails")
            .upload(file.filename, thumbnailBuffer, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabaseClient.storage
              .from("thumbnails")
              .getPublicUrl(file.filename);
            if (thumbUrlData?.publicUrl) {
              finalThumbnailUrl = thumbUrlData.publicUrl;
            }
          }
        } catch (storageErr: any) {
          console.error("Failed to upload assets to Supabase Storage:", storageErr.message);
        }
      }

      const folderId = req.body?.folderId || (req.query?.folderId as string) || null;

      const photo = await photoDb.create({
        albumId,
        folderId,
        url: finalUrl,
        thumbnailUrl: finalThumbnailUrl,
        filename: file.originalname,
        size: file.size,
      });

      if (!album.coverUrl) {
        await albumDb.update(albumId, { coverUrl: finalUrl });
      }

      res.status(201).json({ photo });
    } catch (error: any) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      if (file) {
        const thumbPath = path.join(THUMBNAILS_DIR, file.filename);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
      res.status(500).json({ error: error.message || "Failed to record photo." });
    }
  }
);

// Delete Photo
router.delete("/:id/photos/:photoId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id: albumId, photoId } = req.params;

  try {
    const photo = await photoDb.findById(photoId);
    if (!photo || photo.albumId !== albumId) {
      res.status(404).json({ error: "Photo not found in this album." });
      return;
    }

    const filename = getFilenameFromUrl(photo.url);
    if (filename) {
      const origPath = path.join(ORIGINAL_DIR, filename);
      if (fs.existsSync(origPath)) fs.unlinkSync(origPath);

      const thumbPath = path.join(THUMBNAILS_DIR, filename);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);

      const generalPath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(generalPath)) fs.unlinkSync(generalPath);

      if (isSupabaseConfigured && supabaseClient) {
        try {
          await supabaseClient.storage.from("original-images").remove([filename]);
          await supabaseClient.storage.from("thumbnails").remove([filename]);
        } catch (err: any) {
          console.error("Failed to delete from Supabase storage:", err.message);
        }
      }
    }

    await photoDb.delete(photoId);

    const album = await albumDb.findById(albumId);

    if (album && album.coverUrl === photo.url) {
      const photos = await photoDb.findByAlbumId(albumId);
      const newCover = photos[0]?.url || null;
      await albumDb.update(albumId, { coverUrl: newCover });
    }

    res.json({ message: "Photo deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete photo." });
  }
});

// Rename Photo
router.put("/:id/photos/:photoId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id: albumId, photoId } = req.params;
  const { filename } = req.body;

  if (!filename) {
    res.status(400).json({ error: "New filename is required." });
    return;
  }

  try {
    const photo = await photoDb.findById(photoId);
    if (!photo || photo.albumId !== albumId) {
      res.status(404).json({ error: "Photo not found in this album." });
      return;
    }

    const updatedPhoto = await photoDb.update(photoId, { filename });

    res.json({ photo: updatedPhoto });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to rename photo." });
  }
});

// PUBLIC ENDPOINT: Retrieve Public Gallery details & photos
router.get("/gallery-access/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const album = await albumDb.findById(id);

    if (!album) {
      res.status(404).json({ error: "Wedding gallery not found." });
      return;
    }

    if (!album.isActive) {
      res.status(403).json({ error: "This gallery has been disabled by the photographer." });
      return;
    }

    if (album.expiryDate && new Date() > new Date(album.expiryDate)) {
      res.status(403).json({ error: "This wedding gallery link has expired." });
      return;
    }

    const passwordRequired = !!album.password;
    const clientPassword = req.headers["x-gallery-password"] as string;

    if (passwordRequired && clientPassword !== album.password) {
      res.json({
        album: {
          id: album.id,
          brideName: album.brideName,
          groomName: album.groomName,
          weddingDate: album.weddingDate,
          eventName: album.eventName,
          coverUrl: album.coverUrl,
          description: album.description,
          passwordRequired: true,
          expiryDate: album.expiryDate,
        },
        photos: [],
        authError: true,
      });
      return;
    }

    const photos = await photoDb.findByAlbumId(id);
    const folders = await folderDb.findByAlbumId(id);

    res.json({
      album: {
        id: album.id,
        brideName: album.brideName,
        groomName: album.groomName,
        weddingDate: album.weddingDate,
        eventName: album.eventName,
        coverUrl: album.coverUrl,
        description: album.description,
        passwordRequired,
        expiryDate: album.expiryDate,
      },
      photos,
      folders,
      authError: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error." });
  }
});

// PUBLIC ENDPOINT: Retrieve existing selections of a client
router.get("/gallery-access/:id/selections", async (req, res) => {
  const { id: albumId } = req.params;
  const { clientEmail } = req.query;

  if (!clientEmail) {
    res.status(400).json({ error: "clientEmail is required" });
    return;
  }

  try {
    const selections = await selectionDb.findByAlbumAndClient(albumId, String(clientEmail));
    const allPhotos = await photoDb.findByAlbumId(albumId);
    const photoMap = new Map(allPhotos.map((p) => [p.id, p]));

    const selectedPhotos = selections
      .map((s) => photoMap.get(s.photoId))
      .filter(Boolean);

    res.json({
      selectedPhotoIds: selections.map((s) => s.photoId),
      photos: selectedPhotos,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch selections." });
  }
});

// PUBLIC ENDPOINT: Toggle a client photo selection
router.post("/gallery-access/:id/selections", async (req, res) => {
  const { id: albumId } = req.params;
  const { photoId, clientEmail, clientName, selected } = req.body;

  if (!photoId || !clientEmail) {
    res.status(400).json({ error: "photoId and clientEmail are required." });
    return;
  }

  try {
    const album = await albumDb.findById(albumId);
    if (!album) {
      res.status(404).json({ error: "Album not found." });
      return;
    }
    if (!album.isActive || album.status === "EXPIRED") {
      res.status(403).json({ error: "This album has expired." });
      return;
    }
    if (album.expiryDate && new Date() > new Date(album.expiryDate)) {
      res.status(403).json({ error: "This album has expired." });
      return;
    }

    if (selected) {
      await selectionDb.upsert({
        albumId,
        photoId,
        clientEmail,
        clientName,
      });
    } else {
      await selectionDb.delete(albumId, photoId, clientEmail);
    }

    // Log tracking activity for project visibility
    try {
      const userLabel = clientName || clientEmail || "Client";
      const actionText = selected ? "marked a photo as favorite" : "removed a photo from favorites";
      await albumProofingDb.logActivity(
        albumId,
        "BRIDE",
        "Favorite",
        `Client (${userLabel}) ${actionText}`,
        userLabel
      );
    } catch (actErr) {
      console.warn("Failed to log selection activity:", actErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to save selection." });
  }
});

// ADMIN ENDPOINT: Fetch all client selection summaries for an album
router.get("/:id/client-selections", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const selections = await selectionDb.findByAlbumId(id);
    const photos = await photoDb.findByAlbumId(id);
    const photoMap = new Map(photos.map((p) => [p.id, p]));

    const grouped: Record<string, {
      clientEmail: string;
      clientName: string | null;
      selectionDate: Date;
      photos: any[];
    }> = {};

    selections.forEach((sel) => {
      const photo = photoMap.get(sel.photoId);
      if (photo) {
        if (!grouped[sel.clientEmail]) {
          grouped[sel.clientEmail] = {
            clientEmail: sel.clientEmail,
            clientName: sel.clientName,
            selectionDate: new Date(sel.createdAt),
            photos: [],
          };
        }
        grouped[sel.clientEmail].photos.push(photo);
      }
    });

    res.json({ clientSelections: Object.values(grouped) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch client selections." });
  }
});

// Helper: Retrieve raw file Buffer for original photo quality
async function getOriginalPhotoBuffer(photo: any): Promise<Buffer | null> {
  if (!photo || !photo.url) return null;

  let filePath = "";
  if (photo.url.startsWith("/uploads/original/")) {
    const filename = photo.url.replace("/uploads/original/", "");
    filePath = path.join(ORIGINAL_DIR, filename);
  } else if (photo.url.startsWith("/uploads/")) {
    const filename = photo.url.replace("/uploads/", "");
    filePath = path.join(UPLOADS_DIR, filename);
  }

  if (filePath && fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath);
    } catch (err) {
      console.warn("Could not read local photo file:", filePath, err);
    }
  }

  // If photo URL is remote (e.g. Supabase Storage)
  if (photo.url.startsWith("http://") || photo.url.startsWith("https://")) {
    try {
      const response = await fetch(photo.url);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (e) {
      console.error("Failed to fetch remote photo buffer from URL:", photo.url, e);
    }
  }

  return null;
}

// ADMIN ENDPOINT: Download single folder's photos as a ZIP archive
router.get("/:id/folders/:folderId/download-zip", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id: albumId, folderId } = req.params;
  const { mode } = req.query; // 'selected' or 'all'

  try {
    const folderList = await folderDb.findByAlbumId(albumId);
    const folder = folderList.find((f) => f.id === folderId);
    if (!folder) {
      res.status(404).json({ error: "Folder not found." });
      return;
    }

    const allPhotos = await photoDb.findByAlbumId(albumId);
    const folderPhotos = allPhotos.filter((p) => p.folderId === folderId);

    let photosToZip = folderPhotos;

    if (mode !== "all") {
      // Default to selected photos in this folder
      const selections = await selectionDb.findByAlbumId(albumId);
      const selectedPhotoIds = new Set(selections.map((s) => s.photoId));
      photosToZip = folderPhotos.filter((p) => selectedPhotoIds.has(p.id));
    }

    if (photosToZip.length === 0) {
      res.status(404).json({ error: "No photos found in this folder to download." });
      return;
    }

    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();

    for (const photo of photosToZip) {
      const buf = await getOriginalPhotoBuffer(photo);
      if (buf) {
        zip.addFile(photo.filename, buf);
      }
    }

    const zipBuffer = zip.toBuffer();
    const safeFolderName = folder.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const zipFilename = `${safeFolderName}_Photos.zip`;

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Content-Length": zipBuffer.length,
    });

    res.send(zipBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate folder ZIP archive." });
  }
});

// ADMIN ENDPOINT: Download selected photos as a ZIP archive with structured Bride Side / Groom Side folders
router.get("/:id/selections/download-zip", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { clientEmail } = req.query;

  try {
    let selections = [];
    if (clientEmail) {
      selections = await selectionDb.findByAlbumAndClient(id, String(clientEmail));
    } else {
      selections = await selectionDb.findByAlbumId(id);
    }

    if (!selections || selections.length === 0) {
      res.status(404).json({ error: "No selected photos found to download." });
      return;
    }

    const allPhotos = await photoDb.findByAlbumId(id);
    const photoMap = new Map(allPhotos.map((p) => [p.id, p]));

    const folders = await folderDb.findByAlbumId(id);
    const folderMap = new Map(folders.map((f) => [f.id, f]));

    const photosToZip = selections
      .map((s) => photoMap.get(s.photoId))
      .filter(Boolean);

    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();

    for (const photo of photosToZip) {
      const parentFolder = photo.folderId ? folderMap.get(photo.folderId) : null;
      let zipFolderPath = "";

      if (parentFolder) {
        const sidePrefix = parentFolder.side === "BRIDE" 
          ? "Bride Side" 
          : parentFolder.side === "GROOM" 
          ? "Groom Side" 
          : "General";
        zipFolderPath = `${sidePrefix}/${parentFolder.name}`;
      } else {
        zipFolderPath = "General";
      }

      const buf = await getOriginalPhotoBuffer(photo);
      if (buf) {
        zip.addFile(`${zipFolderPath}/${photo.filename}`, buf);
      }
    }

    const zipBuffer = zip.toBuffer();
    const zipFilename = `Wedding_Selected_Photos.zip`;

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Content-Length": zipBuffer.length,
    });

    res.send(zipBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate ZIP archive." });
  }
});

export default router;
