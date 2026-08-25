import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  MAINTENANCE_TAG,
  MAINTENANCE_DEFAULT,
  normalizeMaintenance,
  type MaintenanceSetting,
  MAIL_THROUGHPUT_TAG,
  MAIL_THROUGHPUT_DEFAULT,
  normalizeMailThroughput,
  type MailThroughputSetting,
  TICKER_SPEED_TAG,
  TICKER_SPEED_DEFAULT,
  normalizeTickerSpeed,
  type TickerSpeedSetting,
} from "@/lib/services/platform-settings-shared";

/* ── Reading platform settings ──────────────────────────────────────────
 * Separate from ./platform-settings.ts, which is "use server". Every export of
 * a "use server" module becomes a callable server-action endpoint, so having
 * the reader there published the whole settings object — including
 * `allowEmails`, the list of people let through during maintenance — to any
 * unauthenticated caller who POSTed to the action id. Nothing here is exported
 * to the client: `server-only` makes importing it from a client component a
 * build error rather than a silent leak.
 */

/**
 * The maintenance setting. Cached for 30s and tagged so `setMaintenance` can
 * purge it for an effectively instant flip.
 *
 * Fails OPEN — a missing table (pre-migration) or a DB hiccup resolves to
 * `enabled: false`. Failing closed would let one bad query take the whole
 * public site down, which is far worse than a maintenance screen not showing.
 */
const readMaintenance = unstable_cache(
  async (): Promise<MaintenanceSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'maintenance' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return MAINTENANCE_DEFAULT;
      // pg returns jsonb already parsed; tolerate a string just in case.
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeMaintenance(value);
    } catch {
      return MAINTENANCE_DEFAULT;
    }
  },
  ["platform-setting-maintenance"],
  { revalidate: 30, tags: [MAINTENANCE_TAG] },
);

/** Full setting — server-side callers only (gate, admin page, robots). */
export async function getMaintenance(): Promise<MaintenanceSetting> {
  return readMaintenance();
}

/**
 * Just the flag and the display copy — no `allowEmails`. What the public
 * maintenance page needs, and the only shape that should ever travel toward a
 * rendered response.
 */
export async function getMaintenancePublic(): Promise<
  Pick<MaintenanceSetting, "enabled" | "headline" | "message" | "etaText">
> {
  const { enabled, headline, message, etaText } = await readMaintenance();
  return { enabled, headline, message, etaText };
}

/**
 * Mail throughput. Same fail-open reasoning as maintenance: if the setting can't
 * be read, fall back to the conservative default rather than either stalling the
 * queue or sending at an unbounded rate.
 */
const readMailThroughput = unstable_cache(
  async (): Promise<MailThroughputSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'mail_throughput' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return MAIL_THROUGHPUT_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeMailThroughput(value);
    } catch {
      return MAIL_THROUGHPUT_DEFAULT;
    }
  },
  ["platform-setting-mail-throughput"],
  { revalidate: 30, tags: [MAIL_THROUGHPUT_TAG] },
);

export async function getMailThroughput(): Promise<MailThroughputSetting> {
  return readMailThroughput();
}

/**
 * Ticker speed. Same fail-open reasoning as the settings above: an unreadable
 * value falls back to the default rather than leaving the marquee with no
 * duration, which would render it motionless.
 */
const readTickerSpeed = unstable_cache(
  async (): Promise<TickerSpeedSetting> => {
    try {
      const res = await db.execute(
        sql`SELECT value FROM platform_setting WHERE key = 'ticker_speed' LIMIT 1`,
      );
      const row = (res.rows as { value?: unknown }[])[0];
      if (!row) return TICKER_SPEED_DEFAULT;
      const value = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      return normalizeTickerSpeed(value);
    } catch {
      return TICKER_SPEED_DEFAULT;
    }
  },
  ["platform-setting-ticker-speed"],
  { revalidate: 30, tags: [TICKER_SPEED_TAG] },
);

export async function getTickerSpeed(): Promise<TickerSpeedSetting> {
  return readTickerSpeed();
}
