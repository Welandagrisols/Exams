import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "passport-openidconnect";
import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db, pool } from "@workspace/db";
import { usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

if (!process.env.REPLIT_DEPLOYMENT_ID && !process.env.REPL_ID) {
  throw new Error("Not running in a Replit environment");
}

const REPLIT_DOMAINS = process.env.REPLIT_DOMAINS;
const callbackURL = `https://${REPLIT_DOMAINS}/api/callback`;

let config: client.Configuration;

async function getOidcConfig(): Promise<client.Configuration> {
  if (!config) {
    config = await client.discovery(
      new URL("https://replit.com/oidc"),
      process.env.REPL_ID!,
    );
  }
  return config;
}

export async function setupAuth(app: Express): Promise<void> {
  const PgStore = connectPg(session);

  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      store: new PgStore({ pool, tableName: "sessions", createTableIfMissing: true }),
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const oidcConfig = await getOidcConfig();

  const verify: VerifyFunction = async (
    _issuer,
    profile,
    _context,
    _idToken,
    accessToken,
    _refreshToken,
    params,
    done,
  ) => {
    try {
      const userInfo = await client.fetchUserInfo(
        oidcConfig,
        accessToken as string,
        profile.id,
      );

      const upsertData = {
        id: userInfo.sub,
        email: userInfo.email ?? null,
        firstName: userInfo.given_name ?? null,
        lastName: userInfo.family_name ?? null,
        profileImageUrl: userInfo.profile_image_url as string ?? null,
        updatedAt: new Date(),
      };

      const [user] = await db
        .insert(usersTable)
        .values({ ...upsertData, createdAt: new Date() })
        .onConflictDoUpdate({ target: usersTable.id, set: upsertData })
        .returning();

      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  };

  passport.use(
    new Strategy(
      {
        name: "replitauth:openidconnect",
        issuer: "https://replit.com/oidc",
        authorizationURL: `https://replit.com/oauth/authorise`,
        tokenURL: `https://replit.com/oauth/token`,
        userInfoURL: `https://replit.com/oauth/userinfo`,
        clientID: process.env.REPL_ID!,
        clientSecret: process.env.REPL_ID!,
        callbackURL,
        scope: ["openid", "profile", "email", "offline_access"],
        pkce: true,
        state: true,
      },
      verify,
    ),
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as { id: string }).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
      done(null, user ?? null);
    } catch (err) {
      done(err);
    }
  });
}

export function isAuthenticated(): RequestHandler {
  return (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "Unauthorised" });
  };
}
