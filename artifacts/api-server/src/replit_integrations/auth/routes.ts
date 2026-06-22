import type { Express } from "express";
import passport from "passport";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/login", passport.authenticate("replitauth:openidconnect"));

  app.get(
    "/api/callback",
    passport.authenticate("replitauth:openidconnect", {
      successRedirect: "/",
      failureRedirect: "/api/login",
    }),
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}
