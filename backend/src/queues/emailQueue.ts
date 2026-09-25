import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 * 24 * 7 }, // keep 7 days for debugging, then Redis drops them
    removeOnFail: false, // keep failed jobs visible for inspection
  },
});

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded string
  contentType?: string;
}

export interface EmailJobPayload {
  emailJobId: string; // our Postgres EmailJob.id — the source of truth
  recipient: string;
  subject: string;
  body: string;
  fromSender: string;
  attachments?: EmailAttachment[];
}

/**
 * Schedules a single email as a BullMQ delayed job.
 * jobId = emailJobId so re-calling this with the same emailJobId is a no-op if the
 * job is still waiting/active in BullMQ (idempotency against duplicate API calls / retries).
 */
export async function enqueueEmailJob(
  payload: EmailJobPayload,
  sendAt: Date,
  jobIdSuffix = ""
) {
  const delayMs = Math.max(0, sendAt.getTime() - Date.now());
  const jobId = jobIdSuffix
    ? `${payload.emailJobId}__${jobIdSuffix}`
    : payload.emailJobId;

  const job = await emailQueue.add("send-email", payload, {
    delay: delayMs,
    jobId,
  });
  return job;
}
