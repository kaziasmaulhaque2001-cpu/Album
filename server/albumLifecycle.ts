import fs from "fs";
import path from "path";
import { albumDb, photoDb, selectionDb, settingsDb, deletedAlbumDb, adminNotificationDb } from "./supabaseDb.js";
import { isSupabaseConfigured, supabaseClient } from "./supabase.js";
import { getFilenameFromUrl } from "./supabaseSync.js";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const ORIGINAL_DIR = path.join(UPLOADS_DIR, "original");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

// Main Album Lifecycle evaluation logic
export async function evaluateAlbumLifecycles() {
  console.log("[Lifecycle] Evaluating all albums for status transitions, expiry, and cleanups...");
  
  try {
    const settings = await settingsDb.get();

    const expiryDays = settings.expiryDays ?? 30;
    const gracePeriodDays = settings.gracePeriodDays ?? 7;

    const albums = await albumDb.findMany();
    const now = new Date();

    for (const album of albums) {
      let expiryDate = album.expiryDate;
      if (!expiryDate) {
        const createdDate = new Date(album.createdAt);
        expiryDate = new Date(createdDate.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
        await albumDb.update(album.id, { expiryDate });
        console.log(`[Lifecycle] Fixed missing expiryDate for "${album.brideName} & ${album.groomName}": Set to ${expiryDate}`);
      }

      const expDate = new Date(expiryDate);
      const graceEndDate = new Date(expDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

      const diffMs = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const diffDeleteMs = graceEndDate.getTime() - now.getTime();
      const diffDeleteDays = Math.ceil(diffDeleteMs / (1000 * 60 * 60 * 24));

      const isPastExpiry = now >= expDate;
      const isPastGrace = now >= graceEndDate;

      if (isPastGrace) {
        console.log(`[Lifecycle] Permanently deleting album "${album.brideName} & ${album.groomName}" (ID: ${album.id}). Past grace period end.`);
        await permanentlyDeleteAlbumInstance(album);
        continue;
      } else if (isPastExpiry) {
        if (album.status === "ACTIVE") {
          console.log(`[Lifecycle] Album "${album.brideName} & ${album.groomName}" is past expiry. Changing status from ACTIVE to EXPIRED.`);
          await albumDb.update(album.id, {
            status: "EXPIRED",
            isActive: false,
            statusChangedAt: now.toISOString(),
          });

          await sendAdminNotification(
            album.id,
            `${album.brideName} & ${album.groomName}`,
            "EXPIRED",
            `Album "${album.brideName} & ${album.groomName}" has officially expired today (${expDate.toLocaleDateString()}). It is now in the 7-day grace period.`
          );
        }
      } else {
        if (album.status === "EXPIRED" && album.isActive === false && now < expDate) {
          await albumDb.update(album.id, {
            status: "ACTIVE",
            isActive: true,
            statusChangedAt: now.toISOString(),
          });
          console.log(`[Lifecycle] Album "${album.brideName} & ${album.groomName}" restored to ACTIVE due to updated expiry date.`);
        }
      }

      if (diffDays === 7 && !isPastExpiry) {
        await sendAdminNotification(
          album.id,
          `${album.brideName} & ${album.groomName}`,
          "EXPIRY_7_DAYS",
          `Album "${album.brideName} & ${album.groomName}" is expiring in 7 days on ${expDate.toLocaleDateString()}.`
        );
      }
      if (diffDays === 3 && !isPastExpiry) {
        await sendAdminNotification(
          album.id,
          `${album.brideName} & ${album.groomName}`,
          "EXPIRY_3_DAYS",
          `Album "${album.brideName} & ${album.groomName}" is expiring in 3 days on ${expDate.toLocaleDateString()}.`
        );
      }
      if (diffDays === 1 && !isPastExpiry) {
        await sendAdminNotification(
          album.id,
          `${album.brideName} & ${album.groomName}`,
          "EXPIRY_1_DAY",
          `Album "${album.brideName} & ${album.groomName}" is expiring tomorrow on ${expDate.toLocaleDateString()}!`
        );
      }
      if (diffDeleteDays === 1 && isPastExpiry) {
        await sendAdminNotification(
          album.id,
          `${album.brideName} & ${album.groomName}`,
          "PERMANENT_DELETE_24H",
          `Warning: Album "${album.brideName} & ${album.groomName}" will be permanently deleted and purged in 24 hours!`
        );
      }
    }
  } catch (err: any) {
    console.error("[Lifecycle] Error during evaluation cycle:", err.message);
  }
}

export async function permanentlyDeleteAlbumInstance(album: any) {
  try {
    let freedStorage = 0;

    const photos = album.photos || (await photoDb.findByAlbumId(album.id));
    const selections = album.selections || (await selectionDb.findByAlbumId(album.id));

    for (const photo of photos) {
      freedStorage += photo.size || 0;
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
            console.log(`[Lifecycle] Purged "${filename}" from Supabase buckets.`);
          } catch (storageErr: any) {
            console.error(`[Lifecycle] Supabase file delete error for "${filename}":`, storageErr.message);
          }
        }
      }
    }

    await deletedAlbumDb.create({
      albumId: album.id,
      brideName: album.brideName,
      groomName: album.groomName,
      weddingDate: album.weddingDate,
      eventName: album.eventName,
      description: album.description || "",
      freedStorage,
      photosCount: photos.length,
      selectionsCount: selections.length,
    }).catch(err => {
      console.error("[Lifecycle] Failed to write deleted album log:", err.message);
    });

    await albumDb.delete(album.id);

    console.log(`[Lifecycle] Purged album "${album.brideName} & ${album.groomName}" successfully. Freed ${freedStorage} bytes.`);
  } catch (err: any) {
    console.error(`[Lifecycle] Failed to execute permanent delete for album "${album.brideName}":`, err.message);
  }
}

async function sendAdminNotification(albumId: string, albumName: string, type: string, message: string) {
  try {
    const existing = await adminNotificationDb.findFirst(albumId, type);

    if (!existing) {
      await adminNotificationDb.create({
        albumId,
        albumName,
        type,
        message,
      });
      console.log(`[Lifecycle Notification] Dispatched [${type}] for "${albumName}": ${message}`);
    }
  } catch (err: any) {
    console.error(`[Lifecycle] Failed to dispatch admin notification:`, err.message);
  }
}

export function startAlbumLifecycleBackgroundJob() {
  console.log("[Lifecycle] Initiating Album Lifecycle background daemon scheduler...");
  
  evaluateAlbumLifecycles().catch(err => {
    console.error("[Lifecycle] Initial evaluation failed:", err);
  });

  const getMsUntil2AM = () => {
    const now = new Date();
    const next2AM = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      2, 0, 0, 0
    );
    if (now.getHours() >= 2) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    return next2AM.getTime() - now.getTime();
  };

  const scheduleNextRun = () => {
    const delay = getMsUntil2AM();
    console.log(`[Lifecycle] Next automatic lifecycle cleanup scheduled to run at 2:00 AM (in ${Math.round(delay / 1000 / 60)} minutes).`);
    
    setTimeout(async () => {
      try {
        await evaluateAlbumLifecycles();
      } catch (err) {
        console.error("[Lifecycle] Automatic daily evaluation failed:", err);
      }
      scheduleNextRun();
    }, delay);
  };

  scheduleNextRun();
}
