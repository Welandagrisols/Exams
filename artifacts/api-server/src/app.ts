import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/auth";
import { pool } from "@workspace/db";

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "edumetrics-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.get("/api/login", (req, res) => {
  const userId = req.headers["x-replit-user-id"] as string | undefined;
  const userName = req.headers["x-replit-user-name"] as string | undefined;
  const userProfileImage = req.headers["x-replit-user-profile-image"] as string | undefined;

  if (userId) {
    (req.session as any).user = {
      id: userId,
      email: null,
      firstName: userName ?? null,
      lastName: null,
      profileImageUrl: userProfileImage ?? null,
    };
    req.session.save(() => {
      res.redirect("/");
    });
    return;
  }

  const domain = process.env.REPLIT_DEV_DOMAIN ?? "";
  res.redirect(`https://replit.com/auth_with_repl_site?domain=${domain}`);
});

app.get("/api/auth/user", (req, res) => {
  const sessionUser = (req.session as any)?.user;

  const userId = req.headers["x-replit-user-id"] as string | undefined;
  const userName = req.headers["x-replit-user-name"] as string | undefined;
  const userProfileImage = req.headers["x-replit-user-profile-image"] as string | undefined;

  if (userId && !sessionUser) {
    const user = {
      id: userId,
      email: null,
      firstName: userName ?? null,
      lastName: null,
      profileImageUrl: userProfileImage ?? null,
    };
    (req.session as any).user = user;
    req.session.save(() => {});
    res.json(user);
    return;
  }

  if (!sessionUser) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  res.json(sessionUser);
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      logger.error({ err }, "Session destroy error");
    }
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.use("/api", (req, res, next) => {
  if (req.path === "/healthz" || req.path === "/health") return next();
  return requireAuth(req, res, next);
});
app.use("/api", router);

export default app;
