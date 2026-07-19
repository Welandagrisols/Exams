import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/healthz") return next();
  return requireAuth(req, res, next);
});
app.use("/api", router);

// In production, serve the built web app and fall back to index.html for SPA routes
if (process.env.NODE_ENV === "production") {
  const webDir = path.resolve(__dirname, "../../exam-analyser/dist/public");
  app.use(express.static(webDir));
  // SPA fallback — Express 5 requires a named wildcard segment
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });
}

// Global JSON error handler — must have exactly 4 params for Express to treat it as error middleware.
// Express 5 forwards async throws here automatically; Express 4 requires next(err) in routes.
// Without this, Express falls back to its default HTML error page which clients cannot parse.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  if (!res.headersSent) {
    // In production, never expose raw error messages to clients — they may
    // contain database schema details or stack traces.
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({ error: isDev ? (err.message ?? "Internal server error") : "Internal server error" });
  }
});

export default app;
