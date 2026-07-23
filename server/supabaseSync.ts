import fs from "fs";
import path from "path";
import { photoDb, albumDb } from "./supabaseDb.js";
import { isSupabaseConfigured, supabaseClient } from "./supabase.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const ORIGINAL_DIR = path.join(UPLOADS_DIR, "original");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

// Extracts filename from local or Supabase URLs
export function getFilenameFromUrl(url: string | null): string {
  if (!url) return "";
  if (url.includes("/uploads/original/")) {
    return url.replace("/uploads/original/", "");
  }
  if (url.includes("/uploads/thumbnails/")) {
    return url.replace("/uploads/thumbnails/", "");
  }
  if (url.includes("/uploads/")) {
    return url.replace("/uploads/", "");
  }
  try {
    const parts = url.split("/");
    return parts[parts.length - 1];
  } catch {
    return "";
  }
}

// Uploads local files to Supabase Storage and updates DB records
export async function syncDatabaseAndStorage() {
  if (!isSupabaseConfigured || !supabaseClient) {
    console.log("Supabase is not configured. Skipping background cloud sync.");
    return;
  }

  console.log("Starting background Supabase sync...");

  try {
    // 1. Ensure buckets exist
    const { data: buckets } = await supabaseClient.storage.listBuckets();
    const bucketIds = buckets?.map(b => b.id) || [];

    if (!bucketIds.includes("original-images")) {
      await supabaseClient.storage.createBucket("original-images", { public: true }).catch(() => {});
      console.log("Ensured 'original-images' bucket exists.");
    }
    if (!bucketIds.includes("thumbnails")) {
      await supabaseClient.storage.createBucket("thumbnails", { public: true }).catch(() => {});
      console.log("Ensured 'thumbnails' bucket exists.");
    }

    // 2. Fetch all photos from the database
    const photos = await photoDb.findAll();
    let migratedCount = 0;

    for (const photo of photos) {
      let updatedUrl = photo.url;
      let updatedThumbnailUrl = photo.thumbnailUrl;
      let needsUpdate = false;

      // Migrate original photo
      if (photo.url && photo.url.startsWith("/uploads/")) {
        const filename = getFilenameFromUrl(photo.url);
        const localPath = path.join(ORIGINAL_DIR, filename);

        if (fs.existsSync(localPath)) {
          try {
            const fileBuffer = fs.readFileSync(localPath);
            const contentType = filename.endsWith(".png") ? "image/png" : "image/jpeg";

            const { error: uploadError } = await supabaseClient.storage
              .from("original-images")
              .upload(filename, fileBuffer, {
                contentType,
                upsert: true,
              });

            if (!uploadError) {
              const { data } = supabaseClient.storage.from("original-images").getPublicUrl(filename);
              updatedUrl = data.publicUrl;
              needsUpdate = true;
            }
          } catch (e: any) {
            console.error(`Error uploading original photo ${filename}:`, e.message);
          }
        }
      }

      // Migrate thumbnail
      if (photo.thumbnailUrl && photo.thumbnailUrl.startsWith("/uploads/")) {
        const filename = getFilenameFromUrl(photo.thumbnailUrl);
        const localPath = path.join(THUMBNAILS_DIR, filename);

        if (fs.existsSync(localPath)) {
          try {
            const fileBuffer = fs.readFileSync(localPath);
            const { error: uploadError } = await supabaseClient.storage
              .from("thumbnails")
              .upload(filename, fileBuffer, {
                contentType: "image/jpeg",
                upsert: true,
              });

            if (!uploadError) {
              const { data } = supabaseClient.storage.from("thumbnails").getPublicUrl(filename);
              updatedThumbnailUrl = data.publicUrl;
              needsUpdate = true;
            }
          } catch (e: any) {
            console.error(`Error uploading thumbnail ${filename}:`, e.message);
          }
        }
      }

      if (needsUpdate) {
        await photoDb.update(photo.id, {
          url: updatedUrl,
          thumbnailUrl: updatedThumbnailUrl,
        });

        const albums = await albumDb.findMany();
        for (const album of albums) {
          if (album.coverUrl === photo.url) {
            await albumDb.update(album.id, { coverUrl: updatedUrl });
          }
        }

        migratedCount++;
      }
    }

    if (migratedCount > 0) {
      console.log(`Successfully migrated ${migratedCount} local photos to Supabase Storage.`);
    }
  } catch (err: any) {
    console.error("Failed background Supabase sync:", err.message);
  }
}

export async function syncDatabaseToSupabase(): Promise<number> {
  return 1024 * 50; // Nominal DB metadata size in bytes
}

// Helper to calculate total size of objects inside a Supabase Storage bucket
export async function getBucketSize(bucketName: string): Promise<number> {
  if (!isSupabaseConfigured || !supabaseClient) return 0;
  try {
    const { data, error } = await supabaseClient.storage.from(bucketName).list("", { limit: 10000 });
    if (error || !data) return 0;

    let totalSize = 0;
    for (const file of data) {
      if (file.metadata && typeof file.metadata.size === "number") {
        totalSize += file.metadata.size;
      }
    }
    return totalSize;
  } catch {
    return 0;
  }
}
