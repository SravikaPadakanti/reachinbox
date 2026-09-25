import IORedis from "ioredis";
import { env } from "./env";

const isTls = env.redisUrl.startsWith("rediss://") || env.redisUrl.includes("upstash.io");
const connectionUrl = isTls && env.redisUrl.startsWith("redis://") 
  ? env.redisUrl.replace("redis://", "rediss://") 
  : env.redisUrl;

// maxRetriesPerRequest: null is required by BullMQ's blocking connections
export const redisConnection = new IORedis(connectionUrl, {
  maxRetriesPerRequest: null,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
});

redisConnection.on("connect", () => {
  // Log only the host, never the full URL — it contains the password.
  const host = env.redisUrl.replace(/\/\/.*@/, "//<redacted>@");
  console.log("[redis] connected:", host);
});

redisConnection.on("error", (err) => {
  // Deliberately NOT swallowing this — if Redis is down, we want it loud, not a silent fallback.
  console.error("[redis] connection error:", err.message);
});
