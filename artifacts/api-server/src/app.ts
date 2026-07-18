import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/auth";

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

// Global JSON error handler — must have exactly 4 params for Express to treat it as error middleware.
// Express 5 forwards async throws here automatically; Express 4 requires next(err) in routes.
// Without this, Express falls back to its default HTML error page which clients cannot parse.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  if (!res.headersSent) {
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

export default app;
