import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // ✅ CORRECTION: Utiliser fileURLToPath + import.meta.url pour les modules ES6
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Essayons d'abord le chemin relatif au répertoire courant (production)
  let distPath = path.resolve(process.cwd(), "dist", "public");
  
  // Si ça n'existe pas, essayons le chemin relatif au fichier compilé
  if (!fs.existsSync(distPath)) {
    distPath = path.resolve(__dirname, "public");
  }
  
  // Si ça n'existe toujours pas, affiche un diagnostic détaillé
  if (!fs.existsSync(distPath)) {
    console.error("❌ Could not find build directory at:");
    console.error(`   - ${path.resolve(process.cwd(), "dist", "public")}`);
    console.error(`   - ${path.resolve(__dirname, "public")}`);
    console.error(`\n📁 Checking what's in ${process.cwd()}:`);
    try {
      const contents = fs.readdirSync(process.cwd());
      console.error(contents);
    } catch (e) {
      console.error("Could not read directory");
    }
    throw new Error(
      `Could not find the build directory. Expected static files at: ${distPath}`
    );
  }

  console.log(`✅ Serving static files from: ${distPath}`);

  // Serve static assets (JS, CSS, images) with long-term caching
  // Vite generates hashed filenames so these are safe to cache aggressively
  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    index: false, // Don't auto-serve index.html from here
    setHeaders: (res, filePath) => {
      // HTML files must NEVER be cached so new deployments work correctly
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }));

  // Fall through to index.html for any unknown route (SPA routing)
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
