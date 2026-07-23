import fs from "fs";
import path from "path";
import {
  AlbumProofingData,
  AlbumSpread,
  ProofingActivity,
  ProofingComment,
  ProofingSide,
  ProofingStatus,
  ProofingVersion,
  ProofingSettings,
  PageType,
  SpreadType
} from "../src/types/proofing.js";
import { isSupabaseConfigured, supabaseClient } from "./supabase.js";

const DATA_DIR = path.join(process.cwd(), "uploads", "data");
const STORE_FILE = path.join(DATA_DIR, "album_proofing_v2.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

type StoreMap = Record<string, AlbumProofingData>;

function readLocalStore(): StoreMap {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    if (!raw || !raw.trim()) {
      return {};
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to read album_proofing_v2.json:", err);
    return {};
  }
}

function writeLocalStore(store: StoreMap) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function sanitizeUrl(urlStr: string | undefined): string {
  if (!urlStr) return "";
  let s = urlStr.trim();
  if (s.includes("/uploads/")) {
    const idx = s.indexOf("/uploads/");
    return s.substring(idx);
  }
  return s;
}

export function normalizePageType(rawType: string | undefined): PageType {
  if (!rawType) return "spread";
  const val = String(rawType).trim().toLowerCase();
  if (val === "front_cover" || val === "frontcover" || val === "front") {
    return "front_cover";
  }
  if (val === "inside_cover" || val === "insidecover" || val === "inside") {
    return "inside_cover";
  }
  if (
    val === "inside_back_cover" ||
    val === "insidebackcover" ||
    val === "last_inside_cover" ||
    val === "inside_back" ||
    val === "last_inside"
  ) {
    return "inside_back_cover";
  }
  if (val === "back_cover" || val === "backcover" || val === "back") {
    return "back_cover";
  }
  return "spread";
}

function sanitizeProofingData(data: AlbumProofingData): AlbumProofingData {
  if (!data || !data.versions) return data;
  data.versions.forEach((v) => {
    if (v.spreads) {
      v.spreads.forEach((s) => {
        if (s.url) s.url = sanitizeUrl(s.url);
        if (s.thumbnailUrl) s.thumbnailUrl = sanitizeUrl(s.thumbnailUrl);
        else s.thumbnailUrl = s.url;
        s.pageType = normalizePageType(s.pageType || (s as any).type);
        s.type = s.pageType as SpreadType;
      });
      v.spreads = albumProofingDb.reorderCanonicalSpreads(v.spreads);
    }
  });
  return data;
}

function createDefaultProofingData(albumId: string): AlbumProofingData {
  const now = new Date().toISOString();
  
  // Default Initial Version for Bride Side
  const initialBrideVersion: ProofingVersion = {
    id: `v-bride-1-${Date.now()}`,
    versionNumber: 1,
    side: 'BRIDE',
    title: 'Bride Side Album - Version 1',
    status: 'Design Started',
    spreads: [],
    isPublished: false,
    createdAt: now,
    updatedAt: now
  };

  // Default Initial Version for Groom Side
  const initialGroomVersion: ProofingVersion = {
    id: `v-groom-1-${Date.now()}`,
    versionNumber: 1,
    side: 'GROOM',
    title: 'Groom Side Album - Version 1',
    status: 'Design Started',
    spreads: [],
    isPublished: false,
    createdAt: now,
    updatedAt: now
  };

  return {
    albumId,
    brideStatus: 'Design Started',
    groomStatus: 'Design Started',
    activeBrideVersionId: initialBrideVersion.id,
    activeGroomVersionId: initialGroomVersion.id,
    versions: [initialBrideVersion, initialGroomVersion],
    comments: [],
    activities: [
      {
        id: `act-${Date.now()}-1`,
        albumId,
        side: 'BRIDE',
        type: 'StatusChange',
        description: 'Bride Side Album Proofing initialized.',
        user: 'System',
        createdAt: now
      },
      {
        id: `act-${Date.now()}-2`,
        albumId,
        side: 'GROOM',
        type: 'StatusChange',
        description: 'Groom Side Album Proofing initialized.',
        user: 'System',
        createdAt: now
      }
    ],
    approvals: [
      { side: 'BRIDE', isApproved: false },
      { side: 'GROOM', isApproved: false }
    ],
    settings: {
      watermarkText: 'PROOF - DO NOT DUPLICATE',
      enableWatermark: false,
      allowComments: true,
      downloadEnabled: false,
      autoApproveDays: 14
    }
  };
}

export const albumProofingDb = {
  async getProofingData(albumId: string): Promise<AlbumProofingData> {
    const store = readLocalStore();
    let data = store[albumId];

    if (!data) {
      data = createDefaultProofingData(albumId);
      store[albumId] = data;
      writeLocalStore(store);
    }

    // Supabase sync fallback / check if needed
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data: dbRow } = await supabaseClient
          .from("album_proofing_store")
          .select("payload")
          .eq("album_id", albumId)
          .single();
        if (dbRow?.payload) {
          data = dbRow.payload;
          store[albumId] = data;
          writeLocalStore(store);
        }
      } catch (e) {
        // Fallback silently to local store
      }
    }

    return sanitizeProofingData(data);
  },

  async saveProofingData(albumId: string, data: AlbumProofingData): Promise<AlbumProofingData> {
    const sanitized = sanitizeProofingData(data);
    const store = readLocalStore();
    store[albumId] = sanitized;
    writeLocalStore(store);

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient
          .from("album_proofing_store")
          .upsert({ album_id: albumId, payload: sanitized, updated_at: new Date().toISOString() });
      } catch (e) {
        console.warn("Supabase save proofing warning:", e);
      }
    }

    return sanitized;
  },

  async addSpread(albumId: string, side: ProofingSide, spread: AlbumSpread): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    let version = data.versions.find(v => v.side === side && v.id === (side === 'BRIDE' ? data.activeBrideVersionId : data.activeGroomVersionId));

    if (!version) {
      // Find latest version for that side or create new
      const sideVersions = data.versions.filter(v => v.side === side);
      if (sideVersions.length > 0) {
        version = sideVersions[sideVersions.length - 1];
      } else {
        const now = new Date().toISOString();
        version = {
          id: `v-${side.toLowerCase()}-1-${Date.now()}`,
          versionNumber: 1,
          side,
          title: `${side === 'BRIDE' ? 'Bride' : 'Groom'} Side Album - Version 1`,
          status: 'Design Started',
          spreads: [],
          isPublished: false,
          createdAt: now,
          updatedAt: now
        };
        data.versions.push(version);
      }
    }

    const pageType = normalizePageType(spread.pageType || (spread as any).type);
    spread.pageType = pageType;
    spread.type = pageType as SpreadType;

    // Unique slot rule: Cover slots replace their existing slot if present
    if (pageType === "front_cover" || pageType === "inside_cover" || pageType === "inside_back_cover" || pageType === "back_cover") {
      const existingIdx = version.spreads.findIndex(
        s => normalizePageType(s.pageType || (s as any).type) === pageType
      );
      if (existingIdx !== -1) {
        version.spreads[existingIdx] = {
          ...version.spreads[existingIdx],
          ...spread,
          pageType,
          type: pageType as SpreadType,
          updatedAt: new Date().toISOString()
        };
      } else {
        version.spreads.push(spread);
      }
    } else {
      version.spreads.push(spread);
    }

    version.updatedAt = new Date().toISOString();
    version.spreads = this.reorderCanonicalSpreads(version.spreads);

    // Activity
    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side,
      type: 'Upload',
      description: `Uploaded ${spread.title} (${spread.filename})`,
      user: 'Admin',
      createdAt: new Date().toISOString()
    });

    return await this.saveProofingData(albumId, data);
  },

  async updateSpreads(albumId: string, side: ProofingSide, versionId: string, spreads: AlbumSpread[]): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const version = data.versions.find(v => v.id === versionId);
    if (version) {
      version.spreads = this.reorderCanonicalSpreads(spreads);
      version.updatedAt = new Date().toISOString();

      data.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        albumId,
        side,
        type: 'Reorder',
        description: `Updated spread layout and page order for ${version.title}`,
        user: 'Admin',
        createdAt: new Date().toISOString()
      });
    }
    return await this.saveProofingData(albumId, data);
  },

  async replaceSpread(albumId: string, side: ProofingSide, versionId: string, spreadId: string, newSpreadData: Partial<AlbumSpread>): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const version = data.versions.find(v => v.id === versionId);
    if (version) {
      const idx = version.spreads.findIndex(s => s.id === spreadId);
      if (idx !== -1) {
        const pageType = normalizePageType(newSpreadData.pageType || newSpreadData.type || version.spreads[idx].pageType);
        version.spreads[idx] = {
          ...version.spreads[idx],
          ...newSpreadData,
          pageType,
          type: pageType as SpreadType,
          updatedAt: new Date().toISOString()
        };
        version.updatedAt = new Date().toISOString();
        version.spreads = this.reorderCanonicalSpreads(version.spreads);

        data.activities.unshift({
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          albumId,
          side,
          type: 'Replace',
          description: `Replaced image for ${version.spreads[idx].title}`,
          user: 'Admin',
          createdAt: new Date().toISOString()
        });
      }
    }
    return await this.saveProofingData(albumId, data);
  },

  async deleteSpread(albumId: string, side: ProofingSide, versionId: string, spreadId: string): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const version = data.versions.find(v => v.id === versionId);
    if (version) {
      const deleted = version.spreads.find(s => s.id === spreadId);
      version.spreads = version.spreads.filter(s => s.id !== spreadId);
      version.spreads = this.reorderCanonicalSpreads(version.spreads);
      version.updatedAt = new Date().toISOString();

      if (deleted) {
        data.activities.unshift({
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          albumId,
          side,
          type: 'Delete',
          description: `Deleted spread ${deleted.title}`,
          user: 'Admin',
          createdAt: new Date().toISOString()
        });
      }
    }
    return await this.saveProofingData(albumId, data);
  },

  async duplicateSpread(albumId: string, side: ProofingSide, versionId: string, spreadId: string): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const version = data.versions.find(v => v.id === versionId);
    if (version) {
      const target = version.spreads.find(s => s.id === spreadId);
      if (target) {
        const copy: AlbumSpread = {
          ...target,
          id: `spread-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          pageType: 'spread',
          type: 'spread',
          title: `Copy of ${target.title}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        version.spreads.push(copy);
        version.spreads = this.reorderCanonicalSpreads(version.spreads);
        version.updatedAt = new Date().toISOString();

        data.activities.unshift({
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          albumId,
          side,
          type: 'Upload',
          description: `Duplicated ${target.title}`,
          user: 'Admin',
          createdAt: new Date().toISOString()
        });
      }
    }
    return await this.saveProofingData(albumId, data);
  },

  async createNewVersion(albumId: string, side: ProofingSide, notes?: string): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const sideVersions = data.versions.filter(v => v.side === side);
    const nextVerNumber = sideVersions.length + 1;
    const now = new Date().toISOString();

    // Copy spreads from current active version
    const activeVerId = side === 'BRIDE' ? data.activeBrideVersionId : data.activeGroomVersionId;
    const currentVer = sideVersions.find(v => v.id === activeVerId) || sideVersions[sideVersions.length - 1];
    
    const copiedSpreads: AlbumSpread[] = (currentVer?.spreads || []).map(s => ({
      ...s,
      id: `spread-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    }));

    const newVersion: ProofingVersion = {
      id: `v-${side.toLowerCase()}-${nextVerNumber}-${Date.now()}`,
      versionNumber: nextVerNumber,
      side,
      title: `${side === 'BRIDE' ? 'Bride' : 'Groom'} Side Album - Version ${nextVerNumber}`,
      status: 'Design Started',
      spreads: this.reorderCanonicalSpreads(copiedSpreads),
      isPublished: false,
      notes: notes || `Created Version ${nextVerNumber}`,
      createdAt: now,
      updatedAt: now
    };

    data.versions.push(newVersion);
    if (side === 'BRIDE') {
      data.activeBrideVersionId = newVersion.id;
    } else {
      data.activeGroomVersionId = newVersion.id;
    }

    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side,
      type: 'Publish',
      description: `Created new draft Version ${nextVerNumber} (${copiedSpreads.length} spreads)`,
      user: 'Admin',
      createdAt: now
    });

    return await this.saveProofingData(albumId, data);
  },

  async publishVersion(albumId: string, side: ProofingSide, versionId: string): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const now = new Date().toISOString();

    // Unpublish previous versions for this side
    data.versions.forEach(v => {
      if (v.side === side) {
        if (v.id === versionId) {
          v.isPublished = true;
          v.publishedAt = now;
          v.status = 'Waiting Client';
        } else {
          v.isPublished = false;
        }
      }
    });

    if (side === 'BRIDE') {
      data.brideStatus = 'Waiting Client';
      data.activeBrideVersionId = versionId;
    } else {
      data.groomStatus = 'Waiting Client';
      data.activeGroomVersionId = versionId;
    }

    const publishedVer = data.versions.find(v => v.id === versionId);

    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side,
      type: 'Publish',
      description: `Published Version ${publishedVer?.versionNumber || 1} for Client Review`,
      user: 'Admin',
      createdAt: now
    });

    return await this.saveProofingData(albumId, data);
  },

  async restoreVersion(albumId: string, side: ProofingSide, targetVersionId: string): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const targetVer = data.versions.find(v => v.id === targetVersionId);
    if (!targetVer) return data;

    const now = new Date().toISOString();
    const sideVersions = data.versions.filter(v => v.side === side);
    const nextVerNumber = sideVersions.length + 1;

    const restoredSpreads: AlbumSpread[] = targetVer.spreads.map(s => ({
      ...s,
      id: `spread-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    }));

    const restoredVersion: ProofingVersion = {
      id: `v-${side.toLowerCase()}-${nextVerNumber}-${Date.now()}`,
      versionNumber: nextVerNumber,
      side,
      title: `${side === 'BRIDE' ? 'Bride' : 'Groom'} Side Album - Version ${nextVerNumber} (Restored from V${targetVer.versionNumber})`,
      status: 'Design Started',
      spreads: this.reorderCanonicalSpreads(restoredSpreads),
      isPublished: false,
      notes: `Restored from Version ${targetVer.versionNumber}`,
      createdAt: now,
      updatedAt: now
    };

    data.versions.push(restoredVersion);
    if (side === 'BRIDE') {
      data.activeBrideVersionId = restoredVersion.id;
    } else {
      data.activeGroomVersionId = restoredVersion.id;
    }

    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side,
      type: 'Restore',
      description: `Restored Version ${targetVer.versionNumber} into new Version ${nextVerNumber}`,
      user: 'Admin',
      createdAt: now
    });

    return await this.saveProofingData(albumId, data);
  },

  async updateStatus(albumId: string, side: ProofingSide, status: ProofingStatus): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    if (side === 'BRIDE') {
      data.brideStatus = status;
    } else {
      data.groomStatus = status;
    }

    const activeVerId = side === 'BRIDE' ? data.activeBrideVersionId : data.activeGroomVersionId;
    const activeVer = data.versions.find(v => v.id === activeVerId);
    if (activeVer) {
      activeVer.status = status;
    }

    // Check approval state
    if (status === 'Approved') {
      const approval = data.approvals.find(a => a.side === side);
      if (approval) {
        approval.isApproved = true;
        approval.approvedAt = new Date().toISOString();
      }
    }

    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side,
      type: 'StatusChange',
      description: `Updated status to "${status}"`,
      user: 'Admin',
      createdAt: new Date().toISOString()
    });

    return await this.saveProofingData(albumId, data);
  },

  async addComment(albumId: string, commentData: Omit<ProofingComment, "id" | "createdAt">): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const now = new Date().toISOString();
    const comment: ProofingComment = {
      ...commentData,
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };

    data.comments.unshift(comment);

    // Update status to Correction Pending if comment added by client
    if (comment.authorRole === 'Client') {
      if (comment.side === 'BRIDE') {
        data.brideStatus = 'Correction Pending';
      } else {
        data.groomStatus = 'Correction Pending';
      }
    }

    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side: comment.side,
      type: 'Comment',
      description: `${comment.author} added a comment on ${comment.spreadTitle || `Spread ${comment.spreadNumber}`}`,
      user: comment.author,
      createdAt: now
    });

    return await this.saveProofingData(albumId, data);
  },

  async updateComment(albumId: string, commentId: string, updates: Partial<ProofingComment>): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    const cmt = data.comments.find(c => c.id === commentId);
    if (cmt) {
      if (updates.status !== undefined) cmt.status = updates.status;
      if (updates.designerReply !== undefined) {
        cmt.designerReply = updates.designerReply;
        cmt.repliedAt = new Date().toISOString();
      }

      data.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        albumId,
        side: cmt.side,
        type: 'Correction',
        description: updates.status === 'Resolved' ? `Resolved comment on ${cmt.spreadTitle}` : `Replied to comment on ${cmt.spreadTitle}`,
        user: 'Admin',
        createdAt: new Date().toISOString()
      });
    }

    return await this.saveProofingData(albumId, data);
  },

  async updateSettings(albumId: string, settings: Partial<ProofingSettings>): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    data.settings = {
      ...data.settings,
      ...settings
    };
    return await this.saveProofingData(albumId, data);
  },

  async logActivity(
    albumId: string,
    side: ProofingSide,
    type: ProofingActivity['type'],
    description: string,
    user: string
  ): Promise<AlbumProofingData> {
    const data = await this.getProofingData(albumId);
    data.activities.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      albumId,
      side: side || 'BRIDE',
      type,
      description,
      user: user || 'Client',
      createdAt: new Date().toISOString()
    });
    return await this.saveProofingData(albumId, data);
  },

  // Helper method to keep canonical page order:
  // Front Cover -> Inside Cover -> Spread 01..XX -> Last Inside Cover -> Back Cover
  reorderCanonicalSpreads(spreads: AlbumSpread[]): AlbumSpread[] {
    if (!Array.isArray(spreads)) return [];

    const normalized = spreads.map((s) => {
      const pt = normalizePageType(s.pageType || (s as any).type);
      return {
        ...s,
        pageType: pt,
        type: pt as SpreadType,
      };
    });

    const frontCover = normalized.filter((s) => s.pageType === "front_cover");
    const insideCover = normalized.filter((s) => s.pageType === "inside_cover");
    const normalSpreads = normalized.filter((s) => s.pageType === "spread");
    const insideBackCover = normalized.filter((s) => s.pageType === "inside_back_cover");
    const backCover = normalized.filter((s) => s.pageType === "back_cover");

    const pickLatest = (arr: AlbumSpread[]) => {
      if (arr.length <= 1) return arr;
      return [
        arr.reduce((a, b) =>
          new Date(b.updatedAt || 0).getTime() > new Date(a.updatedAt || 0).getTime() ? b : a
        ),
      ];
    };

    const finalFront = pickLatest(frontCover).map((s) => ({
      ...s,
      displayOrder: 1,
      title: "Front Cover",
    }));

    const finalInside = pickLatest(insideCover).map((s) => ({
      ...s,
      displayOrder: 2,
      title: "Inside Cover",
    }));

    let spreadCounter = 1;
    const finalNormals = normalSpreads.map((s) => {
      const numStr = String(spreadCounter).padStart(2, "0");
      const order = 2 + spreadCounter;
      spreadCounter++;
      return {
        ...s,
        spreadNumber: spreadCounter - 1,
        displayOrder: s.displayOrder && s.displayOrder > 2 ? s.displayOrder : order,
        title: s.title && s.title.startsWith("Spread") ? s.title : `Spread ${numStr}`,
      };
    });

    finalNormals.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    finalNormals.forEach((s, idx) => {
      s.spreadNumber = idx + 1;
      s.displayOrder = 3 + idx;
      s.title = `Spread ${String(idx + 1).padStart(2, "0")}`;
    });

    const finalInsideBack = pickLatest(insideBackCover).map((s) => ({
      ...s,
      displayOrder: 3 + finalNormals.length,
      title: "Inside Back Cover",
    }));

    const finalBack = pickLatest(backCover).map((s) => ({
      ...s,
      displayOrder: 4 + finalNormals.length,
      title: "Back Cover",
    }));

    return [
      ...finalFront,
      ...finalInside,
      ...finalNormals,
      ...finalInsideBack,
      ...finalBack,
    ];
  }
};
