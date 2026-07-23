import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { authFetch } from "./authUtils";

export interface UploadSpreadResult {
  imageUrl: string;
  filename: string;
  fileSize: number;
}

interface SupabaseConfig {
  isSupabaseConfigured: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
}

let cachedConfig: SupabaseConfig | null = null;
let clientInstance: SupabaseClient | null = null;

export async function getSupabaseUploadConfig(): Promise<SupabaseConfig> {
  if (cachedConfig) return cachedConfig;
  try {
    const res = await fetch("/api/proofing/upload-config");
    if (!res.ok) {
      throw new Error(`Failed to fetch upload config (${res.status})`);
    }
    const data: SupabaseConfig = await res.json();
    cachedConfig = data;
    return data;
  } catch (err: any) {
    console.warn("Upload config fetch warning:", err);
    return {
      isSupabaseConfigured: false,
      supabaseUrl: "",
      supabaseAnonKey: "",
      bucketName: "album-photos",
    };
  }
}

export function getBrowserSupabaseClient(url: string, key: string): SupabaseClient {
  if (!clientInstance) {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    try {
      cleanUrl = new URL(cleanUrl).origin;
    } catch (e) {
      cleanUrl = cleanUrl.replace(/\/(auth|rest)(\/v\d+)?.*$/i, "").replace(/\/+$/, "");
    }

    clientInstance = createClient(cleanUrl, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

/**
 * Uploads a single spread file directly to Supabase Storage (or streaming fallback)
 */
export async function uploadSingleSpreadDirect({
  file,
  albumId,
}: {
  file: File;
  albumId: string;
}): Promise<UploadSpreadResult> {
  // 1. File Type Validation
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!validExtensions.includes(ext)) {
    throw new Error(
      `Upload failed because unsupported file format '${ext}'. Please upload JPG, JPEG, PNG, or WEBP images.`
    );
  }

  // 2. File Size Validation (Target: 100 MB per image)
  const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
  if (file.size > MAX_SIZE) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Upload failed because file '${file.name}' (${sizeInMb} MB) exceeds the maximum allowed size of 100 MB.`
    );
  }

  // 3. Get Upload Config
  const config = await getSupabaseUploadConfig();

  // Primary Path: Direct browser upload to Supabase Storage
  if (config.isSupabaseConfigured && config.supabaseUrl && config.supabaseAnonKey) {
    try {
      const client = getBrowserSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `proofing/${albumId}/spreads/${Date.now()}_${cleanName}`;

      const { error } = await client.storage
        .from(config.bucketName || "album-photos")
        .upload(storagePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
          cacheControl: "3600",
        });

      if (!error) {
        // Get public URL
        const { data: publicData } = client.storage
          .from(config.bucketName || "album-photos")
          .getPublicUrl(storagePath);

        if (publicData?.publicUrl) {
          return {
            imageUrl: publicData.publicUrl,
            filename: file.name,
            fileSize: file.size,
          };
        }
      } else {
        console.warn("Direct Supabase storage upload failed, falling back to server stream upload:", error.message);
      }
    } catch (err: any) {
      console.warn("Direct browser upload exception, falling back to server stream upload:", err.message || err);
    }
  }

  // Fallback Path: Direct Binary Stream Upload to server route (no Multer array / payload limit)
  try {
    const res = await authFetch(`/api/proofing/${albumId}/stream-upload`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
    });

    if (!res.ok) {
      let errText = "Server streaming upload error";
      try {
        const json = await res.json();
        errText = json.error || errText;
      } catch (e) {
        errText = `HTTP ${res.status}: ${res.statusText}`;
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("Upload failed because Authentication failed.");
      }
      throw new Error(`Upload failed because ${errText}`);
    }

    const json = await res.json();
    return {
      imageUrl: json.imageUrl,
      filename: file.name,
      fileSize: file.size,
    };
  } catch (err: any) {
    if (err.message?.startsWith("Upload failed because")) {
      throw err;
    }
    throw new Error(`Upload failed because ${err.message || "Failed to stream upload image"}`);
  }
}

/**
 * Uploads multiple files directly to Supabase Storage and saves metadata in the database
 */
export async function uploadSpreadsAndSaveMetadata({
  albumId,
  side,
  files,
  replaceTargetId,
  coverType,
  onProgress,
}: {
  albumId: string;
  side: string;
  files: File[];
  replaceTargetId?: string | null;
  coverType?: string | null;
  onProgress?: (current: number, total: number, pct: number) => void;
}) {
  if (!files || files.length === 0) return null;

  const total = files.length;
  const uploadedResults: UploadSpreadResult[] = [];

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const pct = Math.min(95, Math.round(((i + 0.2) / total) * 100));
    if (onProgress) onProgress(i, total, pct);

    const result = await uploadSingleSpreadDirect({ file, albumId });
    uploadedResults.push(result);

    const donePct = Math.min(95, Math.round(((i + 1) / total) * 100));
    if (onProgress) onProgress(i + 1, total, donePct);
  }

  // Save metadata to server database
  if (onProgress) onProgress(total, total, 98);

  const metaRes = await authFetch(`/api/proofing/${albumId}/save-uploaded-metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      side,
      uploadedSpreads: uploadedResults,
      replaceTargetId,
      coverType,
    }),
  });

  if (!metaRes.ok) {
    let errText = "Database insert failed";
    try {
      const json = await metaRes.json();
      errText = json.error || errText;
    } catch (e) {
      errText = `HTTP ${metaRes.status}: ${metaRes.statusText}`;
    }
    if (metaRes.status === 401 || metaRes.status === 403) {
      throw new Error("Upload failed because Authentication failed.");
    }
    throw new Error(`Upload failed because ${errText}`);
  }

  if (onProgress) onProgress(total, total, 100);

  const data = await metaRes.json();
  return data;
}
