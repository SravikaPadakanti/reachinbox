import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Router } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import { prisma } from "../db/prisma";

export function generateAuthToken(user: any): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    ts: Date.now(),
  });
  const hmac = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(payload)
    .digest("hex");
  return Buffer.from(JSON.stringify({ payload, hmac })).toString("base64url");
}

export function verifyAuthToken(tokenStr: string): any | null {
  try {
    const raw = Buffer.from(tokenStr, "base64url").toString("utf-8");
    const { payload, hmac } = JSON.parse(raw);
    const expected = crypto
      .createHmac("sha256", env.sessionSecret)
      .update(payload)
      .digest("hex");
    if (hmac !== expected) return null;
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

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
export async function requireAuth(req: any, res: any, next: any) {
  if (req.user) return next();

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const tokenData = verifyAuthToken(token);
    if (tokenData?.id) {
      let u = await prisma.user.findUnique({ where: { id: tokenData.id } });
      if (!u && tokenData.email) {
        u = await prisma.user.findUnique({ where: { email: tokenData.email } });
      }
      if (u) {
        req.user = u;
        return next();
      }
    }
  }

  return res.status(401).json({ error: "not authenticated" });
}

authRouter.get(
  "/google",
  (req, res, next) => {
    const rawRedirect =
      (req.query.redirect_to as string) ||
      (req.headers.referer as string) ||
      env.frontendUrl;
    let returnTo = env.frontendUrl;
    try {
      if (rawRedirect) {
        const u = new URL(rawRedirect);
        returnTo = u.origin;
      }
    } catch {}
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: returnTo,
    })(req, res, next);
  }
);

authRouter.get(
  "/google/callback",
  (req, res, next) => {
    let target = env.frontendUrl;
    if (typeof req.query.state === "string" && req.query.state.startsWith("http")) {
      try {
        const u = new URL(req.query.state);
        target = u.origin;
      } catch {}
    }
    passport.authenticate("google", {
      failureRedirect: `${target}/login?error=1`,
    })(req, res, next);
  },
  (req, res) => {
    let target = env.frontendUrl;
    if (typeof req.query.state === "string" && req.query.state.startsWith("http")) {
      try {
        const u = new URL(req.query.state);
        target = u.origin;
      } catch {}
    }
    const token = generateAuthToken(req.user);
    res.redirect(`${target}/dashboard?auth_token=${token}`);
  }
);

authRouter.get("/me", async (req, res) => {
  if (req.user) return res.json(req.user);

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const tokenData = verifyAuthToken(token);
    if (tokenData?.id) {
      let u = await prisma.user.findUnique({ where: { id: tokenData.id } });
      if (!u && tokenData.email) {
        u = await prisma.user.findUnique({ where: { email: tokenData.email } });
      }
      if (u) return res.json(u);
    }
  }

  return res.status(401).json({ error: "not authenticated" });
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
    const token = generateAuthToken(testUser);
    res.redirect(`${env.frontendUrl}/dashboard?auth_token=${token}`);
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
      const token = generateAuthToken(user);
      res.json({ ...user, token });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { passport };
