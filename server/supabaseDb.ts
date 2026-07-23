import { supabaseClient, isSupabaseConfigured } from "./supabase.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "general_settings.json");

// Unique ID generator using crypto or timestamp fallback
export function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 9);
}

// In-Memory Database Store synchronized with Supabase
interface MemoryStore {
  users: Map<string, any>;
  sessions: Map<string, any>;
  albums: Map<string, any>;
  folders: Map<string, any>;
  photos: Map<string, any>;
  selections: Map<string, any>;
  settings: Map<string, any>;
  deletedAlbums: Map<string, any>;
  adminNotifications: Map<string, any>;
}

const db: MemoryStore = {
  users: new Map(),
  sessions: new Map(),
  albums: new Map(),
  folders: new Map(),
  photos: new Map(),
  selections: new Map(),
  settings: new Map(),
  deletedAlbums: new Map(),
  adminNotifications: new Map(),
};

// Default Settings Object
const defaultSettingsRecord = {
  id: "default",
  businessName: "My Studio",
  logoUrl: null,
  watermarkText: null,
  contactEmail: "studio@example.com",
  contactPhone: "+1 (555) 019-2831",
  instagramUrl: null,
  facebookUrl: null,
  theme: "light",
  studioName: "My Studio",
  studioLogo: null,
  favicon: null,
  ownerName: "Studio Admin",
  photographerName: "Studio Admin",
  businessType: "Curated Wedding Photography",
  address: "123 Studio Boulevard",
  city: "New York",
  state: "NY",
  country: "USA",
  phone: "+1 (555) 019-2831",
  whatsApp: "+1 (555) 019-2831",
  email: "studio@example.com",
  supportEmail: "support@example.com",
  website: "https://example.com",
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  youtube: "https://youtube.com",
  googleMapsLink: "https://maps.google.com",
  businessHours: "Mon-Fri: 9:00 AM - 6:00 PM",
  currency: "USD",
  timezone: "America/New_York",
  language: "en",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  primaryColor: "#121211",
  secondaryColor: "#D4AF37",
  accentColor: "#D4AF37",
  backgroundColor: "#fafafa",
  sidebarColor: "#f9f9f9",
  topbarColor: "#ffffff",
  cardColor: "#ffffff",
  buttonColor: "#121211",
  textColor: "#09090b",
  font: "Inter",
  darkMode: false,
  lightMode: true,
  dashboardTheme: "light",
  clientTheme: "light",
  buttonStyle: "rounded-xl",
  cardStyle: "rounded-2xl",
  galleryTitle: "Your Wedding Collection",
  galleryDescription: "Bespoke wedding photography and curated memories.",
  defaultCover: null,
  gridColumns: 4,
  infiniteScroll: false,
  watermarkEnabled: false,
  downloadEnabled: true,
  fullscreenEnabled: true,
  zoomEnabled: true,
  passwordProtection: false,
  linkExpiryEnabled: false,
  expiryDays: 30,
  gracePeriodDays: 7,
  allowReselection: true,
  maxSelectionLimit: 100,
  showSelectionCounter: true,
  allowComments: true,
  showPhotographerContact: true,
  maxUploadSize: 25,
  allowedFileTypes: "jpg,jpeg,png,webp",
  autoThumbnail: true,
  originalImageStorage: "local",
  compressionLevel: 80,
  sessionTimeout: 60,
  twoFactorEnabled: false,
  loginHistory: "[]",
  emailNotification: true,
  whatsAppNotification: false,
  browserNotification: true,
  customDomain: "",
  sslStatus: "Active",
  seoKeywords: "wedding photography, digital gallery, curation",
  seoDescription: "Bespoke digital gallery of curated high-end wedding memories.",
  extendedSettings: "{}",
};

function ensureSettingsStore(): Record<string, Record<string, any>> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const defaultStore = { default: { ...defaultSettingsRecord, hasSavedCustomData: false, isDemoMode: true } };

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
    return defaultStore;
  }

  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    if (!raw || !raw.trim()) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
      return defaultStore;
    }
    const parsed = JSON.parse(raw);
    
    // Support legacy flat format as well as multi-key dictionary format
    if (parsed.studioName || parsed.primaryColor || (parsed.id && !parsed.default)) {
      const rec = { ...defaultSettingsRecord, ...parsed, id: parsed.id || "default" };
      return { [rec.id]: rec, default: rec };
    }
    
    return parsed;
  } catch (err) {
    console.warn("Recovering general_settings.json with defaults after parse issue:", err);
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
    } catch (_) {}
    return defaultStore;
  }
}

function saveLocalSettings(storeObj: Record<string, any>) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(storeObj, null, 2), "utf-8");
}

db.settings.set("default", ensureSettingsStore());

// Initialize / Sync store from Supabase if configured
export async function initSupabaseDb() {
  if (!isSupabaseConfigured || !supabaseClient) return;

  try {
    // 1. Fetch Users
    const { data: users } = await supabaseClient.from("users").select("*");
    if (users) {
      users.forEach((u) => db.users.set(u.id || u.email, u));
    }

    // 2. Fetch Albums
    const { data: albums } = await supabaseClient.from("albums").select("*");
    if (albums) {
      albums.forEach((a) => db.albums.set(a.id, a));
    }

    // Fetch Folders
    try {
      const { data: folders } = await supabaseClient.from("folders").select("*");
      if (folders) {
        folders.forEach((f) => db.folders.set(f.id, f));
      }
    } catch (e) {
      // Folders table might be initialized on first write
    }

    // 3. Fetch Photos
    const { data: photos } = await supabaseClient.from("photos").select("*");
    if (photos) {
      photos.forEach((p) => db.photos.set(p.id, p));
    }

    // 4. Fetch Selections
    const { data: selections } = await supabaseClient.from("selections").select("*");
    if (selections) {
      selections.forEach((s) => db.selections.set(s.id, s));
    }

    // 5. Fetch Settings
    try {
      await settingsDb.get();
    } catch (e) {
      // Fallback
    }
  } catch (err: any) {
    console.log("Supabase table fetch notice:", err.message);
  }
}

// ==================== USER OPERATIONS ====================
export const userDb = {
  async countAdmins(): Promise<number> {
    if (isSupabaseConfigured) {
      const { data, count, error } = await supabaseClient
        .from("users")
        .select("*", { count: "exact" })
        .eq("role", "ADMIN");
      if (!error && count !== null) return count;
      if (data) return data.length;
    }
    let count = 0;
    for (const u of db.users.values()) {
      if (u.role === "ADMIN") count++;
    }
    return count;
  },

  async findByEmail(email: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("email", email)
        .single();
      if (!error && data) {
        db.users.set(data.id, data);
        return data;
      }
    }
    for (const u of db.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  },

  async findById(id: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) return data;
    }
    return db.users.get(id) || null;
  },

  async create(userData: { id?: string; email: string; password: string; name: string; role?: string }) {
    const newUser = {
      id: userData.id || generateUuid(),
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userData.role || "ADMIN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.set(newUser.id, newUser);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("users").upsert([newUser]);
      } catch (e: any) {
        console.error("Supabase user create notice:", e.message);
      }
    }

    return newUser;
  },

  async update(id: string, updates: Record<string, any>) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    db.users.set(id, updated);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("users").update(updates).eq("id", id);
      } catch (e: any) {
        console.error("Supabase user update notice:", e.message);
      }
    }

    return updated;
  },
};

// ==================== SESSION OPERATIONS ====================
export const sessionDb = {
  async findByToken(token: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("sessions")
        .select("*")
        .eq("token", token)
        .single();
      if (!error && data) return data;
    }
    for (const s of db.sessions.values()) {
      if (s.token === token) return s;
    }
    return null;
  },

  async create(sessionData: { userId: string; token: string; expiresAt: Date }) {
    const newSession = {
      id: generateUuid(),
      userId: sessionData.userId,
      token: sessionData.token,
      expiresAt: sessionData.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.sessions.set(newSession.id, newSession);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("sessions").insert([newSession]);
      } catch (e: any) {
        console.error("Supabase session create notice:", e.message);
      }
    }

    return newSession;
  },

  async deleteByToken(token: string) {
    for (const [id, s] of db.sessions.entries()) {
      if (s.token === token) {
        db.sessions.delete(id);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("sessions").delete().eq("token", token);
      } catch (e: any) {
        console.error("Supabase session delete notice:", e.message);
      }
    }
  },

  async deleteForUser(userId: string) {
    for (const [id, s] of db.sessions.entries()) {
      if (s.userId === userId) {
        db.sessions.delete(id);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("sessions").delete().eq("userId", userId);
      } catch (e: any) {
        console.error("Supabase user session delete notice:", e.message);
      }
    }
  },
};

// ==================== ALBUM OPERATIONS ====================
export const albumDb = {
  async findMany(options?: { search?: string }) {
    let albumsList: any[] = [];

    if (isSupabaseConfigured) {
      let query = supabaseClient.from("albums").select("*").order("weddingDate", { ascending: false });
      if (options?.search) {
        const s = options.search;
        query = query.or(`brideName.ilike.%${s}%,groomName.ilike.%${s}%,eventName.ilike.%${s}%`);
      }
      const { data, error } = await query;
      if (!error && data) {
        albumsList = data;
        data.forEach((a) => db.albums.set(a.id, a));
      }
    }

    if (albumsList.length === 0) {
      albumsList = Array.from(db.albums.values());
      if (options?.search) {
        const s = options.search.toLowerCase();
        albumsList = albumsList.filter(
          (a) =>
            a.brideName?.toLowerCase().includes(s) ||
            a.groomName?.toLowerCase().includes(s) ||
            a.eventName?.toLowerCase().includes(s)
        );
      }
      albumsList.sort(
        (a, b) => new Date(b.weddingDate).getTime() - new Date(a.weddingDate).getTime()
      );
    }

    // Attach photo counts and photos array
    const photosList = await photoDb.findAll();
    const selectionsList = await selectionDb.findAll();

    return albumsList.map((album) => {
      const albumPhotos = photosList.filter((p) => p.albumId === album.id);
      const albumSelections = selectionsList.filter((s) => s.albumId === album.id);
      return {
        ...album,
        photos: albumPhotos,
        selections: albumSelections,
        _count: {
          photos: albumPhotos.length,
          selections: albumSelections.length,
        },
        photoCount: albumPhotos.length,
      };
    });
  },

  async findById(id: string) {
    let album = null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("albums").select("*").eq("id", id).single();
      if (!error && data) {
        album = data;
        db.albums.set(data.id, data);
      }
    }

    if (!album) {
      album = db.albums.get(id) || null;
    }

    if (!album) return null;

    const photos = await photoDb.findByAlbumId(id);
    const selections = await selectionDb.findByAlbumId(id);

    return {
      ...album,
      photos,
      selections,
      _count: {
        photos: photos.length,
        selections: selections.length,
      },
      photoCount: photos.length,
    };
  },

  async create(data: any) {
    const newAlbum = {
      id: data.id || generateUuid(),
      brideName: data.brideName,
      groomName: data.groomName,
      weddingDate: data.weddingDate ? new Date(data.weddingDate).toISOString() : new Date().toISOString(),
      eventName: data.eventName,
      description: data.description || "",
      coverUrl: data.coverUrl || null,
      password: data.password || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
      status: data.status || "ACTIVE",
      statusChangedAt: new Date().toISOString(),
      archivedAt: null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.albums.set(newAlbum.id, newAlbum);

    // Automatically create default Bride Side and Groom Side folders for the new album
    try {
      await createDefaultFoldersForAlbum(newAlbum.id);
    } catch (e: any) {
      console.error("Default folders creation notice:", e.message);
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("albums").insert([newAlbum]);
      } catch (e: any) {
        console.error("Supabase album create notice:", e.message);
      }
    }

    return newAlbum;
  },

  async update(id: string, updates: Record<string, any>) {
    const existing = db.albums.get(id);
    const updated = {
      ...(existing || {}),
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    db.albums.set(id, updated);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("albums").update(updates).eq("id", id);
      } catch (e: any) {
        console.error("Supabase album update notice:", e.message);
      }
    }

    return updated;
  },

  async delete(id: string) {
    db.albums.delete(id);

    // Delete associated photos and selections
    for (const [photoId, photo] of db.photos.entries()) {
      if (photo.albumId === id) db.photos.delete(photoId);
    }
    for (const [selId, sel] of db.selections.entries()) {
      if (sel.albumId === id) db.selections.delete(selId);
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("albums").delete().eq("id", id);
        await supabaseClient.from("photos").delete().eq("albumId", id);
        await supabaseClient.from("selections").delete().eq("albumId", id);
      } catch (e: any) {
        console.error("Supabase album delete notice:", e.message);
      }
    }
  },

  async count(): Promise<number> {
    const albums = await this.findMany();
    return albums.length;
  },
};

// ==================== PHOTO OPERATIONS ====================
export const photoDb = {
  async findAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("photos").select("*").order("createdAt", { ascending: false });
      if (!error && data) {
        data.forEach((p) => db.photos.set(p.id, p));
        return data;
      }
    }
    return Array.from(db.photos.values());
  },

  async findByAlbumId(albumId: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient
        .from("photos")
        .select("*")
        .eq("albumId", albumId)
        .order("createdAt", { ascending: false });
      if (!error && data) {
        data.forEach((p) => db.photos.set(p.id, p));
        return data;
      }
    }
    return Array.from(db.photos.values()).filter((p) => p.albumId === albumId);
  },

  async findById(id: string) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("photos").select("*").eq("id", id).single();
      if (!error && data) return data;
    }
    return db.photos.get(id) || null;
  },

  async create(data: any) {
    const newPhoto = {
      id: generateUuid(),
      albumId: data.albumId,
      folderId: data.folderId || null,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl || data.url,
      filename: data.filename,
      size: data.size || 0,
      width: data.width || null,
      height: data.height || null,
      createdAt: new Date().toISOString(),
    };

    db.photos.set(newPhoto.id, newPhoto);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("photos").insert([newPhoto]);
      } catch (e: any) {
        console.error("Supabase photo create notice:", e.message);
      }
    }

    return newPhoto;
  },

  async moveBatch(photoIds: string[], targetFolderId: string | null) {
    for (const photoId of photoIds) {
      const p = db.photos.get(photoId);
      if (p) {
        p.folderId = targetFolderId;
        db.photos.set(photoId, p);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient
          .from("photos")
          .update({ folderId: targetFolderId })
          .in("id", photoIds);
      } catch (e: any) {
        console.error("Supabase photo moveBatch notice:", e.message);
      }
    }
  },

  async update(id: string, updates: Record<string, any>) {
    const existing = db.photos.get(id);
    const updated = { ...(existing || {}), ...updates };
    db.photos.set(id, updated);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("photos").update(updates).eq("id", id);
      } catch (e: any) {
        console.error("Supabase photo update notice:", e.message);
      }
    }

    return updated;
  },

  async delete(id: string) {
    db.photos.delete(id);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("photos").delete().eq("id", id);
      } catch (e: any) {
        console.error("Supabase photo delete notice:", e.message);
      }
    }
  },

  async count(): Promise<number> {
    const photos = await this.findAll();
    return photos.length;
  },
};

// ==================== FOLDER OPERATIONS ====================
export async function createDefaultFoldersForAlbum(albumId: string) {
  const brideFolders = ["Aiburo Bhat", "Mehendi", "Wedding Day", "Wedding Night", "Biday"];
  const groomFolders = ["Aiburo Bhat", "Wedding Day", "Wedding Night", "Boron", "Reception"];

  const createdFolders: any[] = [];
  let orderIndex = 0;

  for (const name of brideFolders) {
    const f = {
      id: generateUuid(),
      albumId,
      name,
      side: "BRIDE",
      coverUrl: null,
      order: orderIndex++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createdFolders.push(f);
  }

  for (const name of groomFolders) {
    const f = {
      id: generateUuid(),
      albumId,
      name,
      side: "GROOM",
      coverUrl: null,
      order: orderIndex++,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createdFolders.push(f);
  }

  for (const folder of createdFolders) {
    db.folders.set(folder.id, folder);
  }

  if (isSupabaseConfigured) {
    try {
      await supabaseClient.from("folders").upsert(createdFolders);
    } catch (e: any) {
      console.warn("Supabase folder batch insert notice:", e.message);
    }
  }

  return createdFolders;
}

export const folderDb = {
  async findByAlbumId(albumId: string) {
    let folderList: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseClient
          .from("folders")
          .select("*")
          .eq("albumId", albumId)
          .order("order", { ascending: true });
        if (!error && data && data.length > 0) {
          folderList = data;
          data.forEach((f) => db.folders.set(f.id, f));
        }
      } catch (e: any) {
        // Fallback
      }
    }

    if (folderList.length === 0) {
      folderList = Array.from(db.folders.values()).filter((f) => f.albumId === albumId);
    }

    // Auto-initialize default folders if album has no folders created yet
    if (folderList.length === 0) {
      folderList = await createDefaultFoldersForAlbum(albumId);
    } else {
      folderList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    const photos = await photoDb.findByAlbumId(albumId);
    const selections = await selectionDb.findByAlbumId(albumId);

    return folderList.map((folder) => {
      const folderPhotos = photos.filter((p) => p.folderId === folder.id);
      const folderPhotoIds = new Set(folderPhotos.map((p) => p.id));
      const folderSelections = selections.filter((s) => folderPhotoIds.has(s.photoId));

      const coverUrl =
        folder.coverUrl ||
        (folderPhotos.length > 0
          ? folderPhotos[0].thumbnailUrl || folderPhotos[0].url
          : null);

      return {
        ...folder,
        coverUrl,
        totalPhotos: folderPhotos.length,
        selectedPhotosCount: folderSelections.length,
      };
    });
  },

  async findById(id: string) {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseClient.from("folders").select("*").eq("id", id).single();
        if (!error && data) return data;
      } catch (e: any) {}
    }
    return db.folders.get(id) || null;
  },

  async create(data: { albumId: string; name: string; side?: string; order?: number; coverUrl?: string }) {
    const existing = await this.findByAlbumId(data.albumId);
    const maxOrder = existing.reduce((max, f) => Math.max(max, f.order ?? 0), -1);

    const sideVal = (data.side || "BRIDE").toUpperCase().includes("GROOM") ? "GROOM" : "BRIDE";

    const newFolder = {
      id: generateUuid(),
      albumId: data.albumId,
      name: data.name,
      side: sideVal,
      coverUrl: data.coverUrl || null,
      order: data.order !== undefined ? data.order : maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.folders.set(newFolder.id, newFolder);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("folders").insert([newFolder]);
      } catch (e: any) {
        console.error("Supabase folder create notice:", e.message);
      }
    }

    return newFolder;
  },

  async update(id: string, updates: Record<string, any>) {
    const existing = db.folders.get(id) || (await this.findById(id));
    const updated = {
      ...(existing || {}),
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    db.folders.set(id, updated);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("folders").update(updates).eq("id", id);
      } catch (e: any) {
        console.error("Supabase folder update notice:", e.message);
      }
    }

    return updated;
  },

  async reorderBatch(albumId: string, folderOrders: { id: string; order: number }[]) {
    for (const item of folderOrders) {
      const existing = db.folders.get(item.id);
      if (existing) {
        existing.order = item.order;
        existing.updatedAt = new Date().toISOString();
        db.folders.set(item.id, existing);
      }
    }

    if (isSupabaseConfigured) {
      try {
        for (const item of folderOrders) {
          await supabaseClient.from("folders").update({ order: item.order }).eq("id", item.id);
        }
      } catch (e: any) {
        console.error("Supabase folder reorder notice:", e.message);
      }
    }
  },

  async delete(id: string) {
    const folder = await this.findById(id);
    db.folders.delete(id);

    for (const [photoId, p] of db.photos.entries()) {
      if (p.folderId === id) {
        p.folderId = null;
        db.photos.set(photoId, p);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("folders").delete().eq("id", id);
        await supabaseClient.from("photos").update({ folderId: null }).eq("folderId", id);
      } catch (e: any) {
        console.error("Supabase folder delete notice:", e.message);
      }
    }

    return folder;
  },
};

// ==================== SELECTION OPERATIONS ====================
export const selectionDb = {
  async findAll() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("selections").select("*").order("createdAt", { ascending: false });
      if (!error && data) {
        data.forEach((s) => db.selections.set(s.id, s));
        return data;
      }
    }
    return Array.from(db.selections.values());
  },

  async findByAlbumId(albumId: string) {
    const all = await this.findAll();
    return all.filter((s) => s.albumId === albumId);
  },

  async findByAlbumAndClient(albumId: string, clientEmail: string) {
    const all = await this.findAll();
    return all.filter((s) => s.albumId === albumId && s.clientEmail === clientEmail);
  },

  async upsert(data: { albumId: string; photoId: string; clientEmail: string; clientName?: string }) {
    let existing = Array.from(db.selections.values()).find(
      (s) => s.albumId === data.albumId && s.photoId === data.photoId && s.clientEmail === data.clientEmail
    );

    if (existing) {
      existing.clientName = data.clientName || existing.clientName;
      db.selections.set(existing.id, existing);
    } else {
      existing = {
        id: generateUuid(),
        albumId: data.albumId,
        photoId: data.photoId,
        clientEmail: data.clientEmail,
        clientName: data.clientName || null,
        createdAt: new Date().toISOString(),
      };
      db.selections.set(existing.id, existing);
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("selections").upsert([existing]);
      } catch (e: any) {
        console.error("Supabase selection upsert notice:", e.message);
      }
    }

    return existing;
  },

  async delete(albumId: string, photoId: string, clientEmail: string) {
    for (const [id, s] of db.selections.entries()) {
      if (s.albumId === albumId && s.photoId === photoId && s.clientEmail === clientEmail) {
        db.selections.delete(id);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient
          .from("selections")
          .delete()
          .match({ albumId, photoId, clientEmail });
      } catch (e: any) {
        console.error("Supabase selection delete notice:", e.message);
      }
    }
  },

  async count(): Promise<number> {
    const list = await this.findAll();
    return list.length;
  },
};

// ==================== SETTINGS OPERATIONS ====================
export const settingsDb = {
  async get(userId: string = "default"): Promise<Record<string, any>> {
    const key = userId || "default";
    const localStore = ensureSettingsStore();
    let current = localStore[key] || localStore["default"] || { ...defaultSettingsRecord };

    if (isSupabaseConfigured && supabaseClient) {
      try {
        let data: any = null;

        // Try fetching from settings table first
        try {
          const { data: setDbData, error: setDbErr } = await supabaseClient
            .from("settings")
            .select("*")
            .eq("id", key)
            .single();
          if (!setDbErr && setDbData) {
            data = setDbData;
          }
        } catch (e) {}

        // Try fetching from app_settings if not found
        if (!data) {
          try {
            const { data: appData, error: appErr } = await supabaseClient
              .from("app_settings")
              .select("*")
              .limit(1);
            if (!appErr && appData && appData.length > 0) {
              data = appData[0];
            }
          } catch (e) {}
        }

        if (data) {
          current = { ...defaultSettingsRecord, ...current, ...data };
          db.settings.set(key, current);
          localStore[key] = current;
          localStore["default"] = current;
          saveLocalSettings(localStore);
          return current;
        }
      } catch (e) {
        console.warn("Supabase settings fetch notice, using local file store:", e);
      }
    }

    if (!current.studioName || !current.studioName.trim()) {
      current.studioName = "My Studio";
    }
    db.settings.set(key, current);
    return current;
  },

  async update(updates: Record<string, any>, userId: string = "default"): Promise<Record<string, any>> {
    const key = userId || "default";
    const current = await this.get(key);
    
    // Mark custom settings saved permanently
    const updated = {
      ...current,
      ...updates,
      id: key,
      userId: key,
      hasSavedCustomData: true,
      isDemoMode: false,
      updatedAt: new Date().toISOString()
    };

    if (!updated.studioName || !updated.studioName.trim()) {
      updated.studioName = "My Studio";
    }

    db.settings.set(key, updated);
    db.settings.set("default", updated);

    // Save to local json file
    const localStore = ensureSettingsStore();
    localStore[key] = updated;
    localStore["default"] = updated;
    saveLocalSettings(localStore);

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("app_settings").upsert([{ id: key, ...updated }]);
        await supabaseClient.from("settings").upsert([{ id: key, ...updated }]);
      } catch (e: any) {
        console.error("Supabase settings update notice:", e.message);
      }
    }

    return updated;
  },
};

// ==================== DELETED ALBUM LOGS ====================
export const deletedAlbumDb = {
  async create(data: any) {
    const entry = {
      id: generateUuid(),
      albumId: data.albumId,
      brideName: data.brideName,
      groomName: data.groomName,
      weddingDate: data.weddingDate ? new Date(data.weddingDate).toISOString() : new Date().toISOString(),
      eventName: data.eventName,
      description: data.description || "",
      freedStorage: data.freedStorage || 0,
      photosCount: data.photosCount || 0,
      selectionsCount: data.selectionsCount || 0,
      deletedAt: new Date().toISOString(),
    };

    db.deletedAlbums.set(entry.id, entry);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("deleted_albums").insert([entry]);
      } catch (e: any) {
        console.error("Supabase deleted_albums create notice:", e.message);
      }
    }

    return entry;
  },

  async findMany() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("deleted_albums").select("*").order("deletedAt", { ascending: false });
      if (!error && data) return data;
    }
    return Array.from(db.deletedAlbums.values()).sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  },
};

// ==================== ADMIN NOTIFICATION LOGS ====================
export const adminNotificationDb = {
  async findFirst(albumId: string, type: string) {
    const all = await this.findMany();
    return all.find((n) => n.albumId === albumId && n.type === type) || null;
  },

  async create(data: any) {
    const entry = {
      id: generateUuid(),
      albumId: data.albumId,
      albumName: data.albumName,
      type: data.type,
      message: data.message,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    db.adminNotifications.set(entry.id, entry);

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("admin_notifications").insert([entry]);
      } catch (e: any) {
        console.error("Supabase admin_notifications create notice:", e.message);
      }
    }

    return entry;
  },

  async findMany() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseClient.from("admin_notifications").select("*").order("createdAt", { ascending: false });
      if (!error && data) return data;
    }
    return Array.from(db.adminNotifications.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async markRead(id: string) {
    const item = db.adminNotifications.get(id);
    if (item) {
      item.isRead = true;
      db.adminNotifications.set(id, item);
    }

    if (isSupabaseConfigured) {
      try {
        await supabaseClient.from("admin_notifications").update({ isRead: true }).eq("id", id);
      } catch (e: any) {
        console.error("Supabase admin_notifications update notice:", e.message);
      }
    }
  },
};
