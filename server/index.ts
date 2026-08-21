import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startCronJobs } from "./cron";
import { setupWebSocket } from "./ws";
import path from "path";

const app = express();
const httpServer = createServer(app);

// Setup WebSocket server
setupWebSocket(httpServer);

// ── CORS — n'accepter que les origines connues ────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.length === 0)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-admin-key");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Redirect www → non-www (canonical URL for SEO) ───────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.hostname && req.hostname.startsWith("www.")) {
    const nonWww = req.hostname.slice(4);
    return res.redirect(301, `https://${nonWww}${req.originalUrl}`);
  }
  next();
});

// ── Headers de sécurité HTTP (équivalent helmet) ──────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Empêche le clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Empêche le sniffing de type MIME
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Active le filtre XSS du navigateur
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Force HTTPS pendant 1 an (production uniquement)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // Empêche le navigateur d'envoyer le Referer complet
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Limite les fonctionnalités du navigateur. On AUTORISE caméra + micro en
  // same-origin (self) : nécessaires à la capture photo (analyse) et à la dictée
  // vocale (getUserMedia). Sans "self", le navigateur bloque tout (NotAllowedError).
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ limit: "10mb", extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Serve pitch decks as static HTML files (process.cwd() = project root in all envs)
  app.use("/decks", express.static(path.join(process.cwd(), "decks")));

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "8080", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      // reusePort (SO_REUSEPORT) n'est supporté que sous Linux (prod Railway).
      // Sous Windows/macOS il lève ENOTSUP → désactivé hors Linux (dev local).
      reusePort: process.platform === "linux",
    },
    () => {
      log(`serving on port ${port}`);
      startCronJobs();
    },
  );
})();
