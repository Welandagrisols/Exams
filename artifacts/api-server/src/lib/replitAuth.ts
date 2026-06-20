import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import type { Express, RequestHandler } from "express";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const REPLIT_DOMAINS = process.env.REPLIT_DOMAINS;

let oidcConfig: client.Configuration | null = null;

async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL("https://replit.com/oidc"),
      process.env.REPL_ID!,
    );
  }
  return oidcConfig;
}

export function getSession(): RequestHandler {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    pool,
    createTableIfMissing: true,
    ttl: sessionTtl / 1000,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: "lax",
    },
    store: sessionStore,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const domains = REPLIT_DOMAINS.split(",");
  for (const domain of domains) {
    const cleanDomain = domain.trim();
    const callbackURL = `https://${cleanDomain}/api/callback`;

    passport.use(
      `replitauth:${cleanDomain}`,
      new Strategy(
        { config, scope: "openid email profile", callbackURL },
        (tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers, done: passport.AuthenticateCallback) => {
          const claims = tokens.claims();
          return done(null, claims);
        },
      ),
    );
  }

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user as Express.User));
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname;
    passport.authenticate(`replitauth:${hostname}`, {
      prompt: "login consent",
      scope: "openid email profile",
    } as passport.AuthenticateOptions)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname;
    passport.authenticate(`replitauth:${hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ claims: req.user });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });
}
