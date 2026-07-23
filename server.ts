import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import authRoutes from "./server/authRoutes.js";
import albumRoutes from "./server/albumRoutes.js";
import settingsRoutes from "./server/settingsRoutes.js";
import albumProofingRoutes from "./server/albumProofingRoutes.js";
import weddingCrewRoutes from "./server/weddingCrewRoutes.js";
import studioClientsRoutes from "./server/studioClientsRoutes.js";
import { initSupabaseDb, settingsDb } from "./server/supabaseDb.js";
import { syncDatabaseAndStorage } from "./server/supabaseSync.js";
import { startAlbumLifecycleBackgroundJob } from "./server/albumLifecycle.js";

const PORT = 3000;

async function startServer() {
  const app = express();

  // Trust proxy for reverse proxies / Cloud Run so req.protocol and req.get("host") resolve correctly
  app.set("trust proxy", true);

  // Basic middleware with high payload limits for high-resolution album spreads
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));

  // Initialize Supabase DB / Store
  await initSupabaseDb();
  await settingsDb.get(); // ensure default settings exist

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/albums", albumRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/proofing", albumProofingRoutes);
  app.use("/api/wedding-crew", weddingCrewRoutes);
  app.use("/api/studio-clients", studioClientsRoutes);

  // Serve uploaded wedding images statically
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Simple API health-check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", database: "supabase", timestamp: new Date() });
  });

  // Serve static assets and Vite support
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode. Mounting Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode. Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Supabase-backed full-stack server running on http://0.0.0.0:${PORT}`);
    // Run sync in the background on boot
    syncDatabaseAndStorage().catch(err => {
      console.error("Failed to run background startup sync:", err);
    });
    // Start background album lifecycle monitoring daemon
    startAlbumLifecycleBackgroundJob();
  });
}

startServer();
