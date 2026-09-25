import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `Missing required env var: ${key}. Refusing to start with a fake/default value — set it in .env`
    );
  }
  return val;
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "4000", 10),
  sessionSecret: required("SESSION_SECRET"),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),

  etherealHost: required("ETHEREAL_HOST"),
  etherealPort: parseInt(process.env.ETHEREAL_PORT || "587", 10),
  etherealUser: required("ETHEREAL_USER"),
  etherealPass: required("ETHEREAL_PASS"),

  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleCallbackUrl: required("GOOGLE_CALLBACK_URL"),

  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  minDelayBetweenEmailsMs: parseInt(
    process.env.MIN_DELAY_BETWEEN_EMAILS_MS || "2000",
    10
  ),
  maxEmailsPerHourPerSender: parseInt(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "200",
    10
  ),
};
