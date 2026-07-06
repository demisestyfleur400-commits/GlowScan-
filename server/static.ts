import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // ✅ SOLUTION: Utiliser process.cwd() qui fonctionne en CommonJS et ES6
  let distPath = path.resolve(process.cwd(), "dist", "public");
  
  // Si ça n'existe pas, essayons sans le "dist"
  if (!fs.existsSync(distPath)) {
    distPath = path.resolve(process.cwd(), "public");
  }
  
  // Si ça n'existe toujours pas, affiche un diagnostic détaillé
  if (!fs.existsSync(distPath)) {
    console.error("❌ Could not find build directory at:");
    console.error(`   - ${path.resolve(process.cwd(), "dist", "public")}`);
    console.error(`   - ${path.resolve(process.cwd(), "public")}`);
    console.error(`\n📁 Current working directory: ${process.cwd()}`);
    console.error(`📁 Checking what's in ${process.cwd()}:`);
    try {
      const contents = fs.readdirSync(process.cwd());
      console.error(contents);
      
      // Essayons aussi de voir ce qui est dans dist/
      const distContents = fs.readdirSync(path.resolve(process.cwd(), "dist"));
      console.error(`\n📁 Contents of dist/: ${distContents}`);
    } catch (e) {
      console.error("Could not read directory:", e);
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

  // Serve blog/index.html explicitly for /blog and /blog/ routes
  // (express.static won't do it with index: false, causing Google to get the SPA instead)
  const blogIndex = path.resolve(distPath, "blog", "index.html");
  if (fs.existsSync(blogIndex)) {
    app.get(["/blog", "/blog/"], (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(blogIndex);
    });
  }

  // Fall through to index.html for any unknown route (SPA routing)
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}