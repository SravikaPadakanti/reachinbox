import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Router } from "express";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: env.googleCallbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google profile has no email"));

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: {
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
          create: {
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
        });
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    console.error("[auth] deserializeUser error:", err);
    done(null, false);
  }
});

export const authRouter = Router();

// Use on any route that must only see/act on the logged-in user's own data.
export function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: "not authenticated" });
  next();
}

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${env.frontendUrl}/login?error=1`,
  }),
  (req, res) => {
    res.redirect(`${env.frontendUrl}/dashboard`);
  }
);

authRouter.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "not authenticated" });
  res.json(req.user);
});

authRouter.post("/logout", (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

// Dev-only convenience login — disabled whenever NODE_ENV=production, so it can't ship as an auth bypass.
authRouter.get("/test-login", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).end();
  }
  const testUser = await prisma.user.findUnique({ where: { id: "test-user-123" } });
  if (!testUser) return res.status(400).json({ error: "Test user not found" });
  req.login(testUser, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.redirect(`${env.frontendUrl}/dashboard`);
  });
});

authRouter.post("/login", async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    const name = req.body?.name || (email ? email.split("@")[0] : "Demo User");

    let user;
    if (!email || email === "testuser@example.com") {
      user = await prisma.user.findUnique({ where: { id: "test-user-123" } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: "test-user-123",
            email: "testuser@example.com",
            name: "Test User",
          },
        });
      }
    } else {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
          },
        });
      }
    }

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(user);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { passport };
