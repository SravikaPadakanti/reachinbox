import express from "express";
import cors from "cors";
import session from "express-session";
import { env } from "./config/env";
import { redisConnection } from "./config/redis";
import { prisma } from "./db/prisma";
import { scheduleRouter } from "./routes/schedule";
import { emailsRouter } from "./routes/emails";
import { authRouter, passport } from "./middleware/auth";

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[process] Uncaught Exception:", error);
});

const app = express();

// Needed behind Render's proxy so express-session sees the connection as secure.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all localhost origins and env.frontendUrl
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      // In production (Render <-> Vercel are different domains) the cookie must be
      // secure + SameSite=None or the browser silently refuses to send it back.
      // Locally (both on localhost) we fall back to normal Lax/insecure cookies.
      secure: env.isProduction,
      sameSite: env.isProduction ? "none" : "lax",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Health check — deliberately does NOT catch-and-hide failures.
// If Redis or Postgres are down, this returns 503, it does not silently report healthy.
app.get("/health", async (_req, res) => {
  const status: Record<string, string> = {};
  try {
    const pong = await redisConnection.ping();
    status.redis = pong === "PONG" ? "ok" : "unexpected response";
  } catch (err: any) {
    status.redis = `error: ${err.message}`;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.postgres = "ok";
  } catch (err: any) {
    status.postgres = `error: ${err.message}`;
  }
  const healthy = status.redis === "ok" && status.postgres === "ok";
  res.status(healthy ? 200 : 503).json(status);
});

app.use("/auth", authRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/emails", emailsRouter);

app.listen(env.port, () => {
  console.log(`[server] listening on :${env.port}`);
});
