import IORedis from "ioredis";
import { env } from "./env";

// maxRetriesPerRequest: null is required by BullMQ's blocking connections
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
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
