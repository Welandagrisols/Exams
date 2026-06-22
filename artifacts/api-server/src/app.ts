import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/auth";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export async function createApp(): Promise<Express> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/login" || req.path === "/callback" || req.path === "/logout" || req.path === "/auth/user") return next();
    return requireAuth(req, res, next);
  });
  app.use("/api", router);

  return app;
}

export default app;
