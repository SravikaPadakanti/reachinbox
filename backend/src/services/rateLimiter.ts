import { redisConnection } from "../config/redis";
import { env } from "../config/env";

/**
 * Atomically: INCR the counter for this sender+hour, set a 1h TTL on first increment,
 * and if we've gone over the limit, immediately DECR back (release the slot) and report denied.
 * Done as a single Lua script so it's safe with many worker processes hitting Redis concurrently.
 */
const CONSUME_SLOT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local count = redis.call("INCR", key)
if count == 1 then
  redis.call("EXPIRE", key, 3600)
end
if count > limit then
  redis.call("DECR", key)
  return 0
else
  return 1
end
`;

function hourWindowKey(sender: string, date: Date): string {
  const iso = date.toISOString(); // e.g. 2026-09-24T14:32:10.000Z
  const hourBucket = iso.slice(0, 13); // 2026-09-24T14
  return `ratelimit:${sender}:${hourBucket}`;
}

export function nextHourBoundary(from: Date): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export async function tryConsumeHourlySlot(
  sender: string,
  limit: number = env.maxEmailsPerHourPerSender
): Promise<{ allowed: boolean; retryAt: Date }> {
  const now = new Date();
  const key = hourWindowKey(sender, now);
  const result = (await redisConnection.eval(
    CONSUME_SLOT_SCRIPT,
    1,
    key,
    limit.toString()
  )) as number;

  return {
    allowed: result === 1,
    retryAt: nextHourBoundary(now),
  };
}
