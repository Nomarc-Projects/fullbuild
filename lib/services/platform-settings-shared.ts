/* ── Maintenance mode: shared constants + types ─────────────────────────
 * Split out of ./platform-settings.ts because that file is "use server", where
 * every export must be an async function. Exporting a const from a "use server"
 * module doesn't just fail for that one export — the bundler emits "the module
 * has no exports at all" and every import of the file breaks. Type-checking
 * doesn't catch it; only a build does.
 */

export const MAINTENANCE_TAG = "platform-setting:maintenance";
export const MAIL_THROUGHPUT_TAG = "platform-setting:mail-throughput";
export const TICKER_SPEED_TAG = "platform-setting:ticker-speed";
export const EXHIBITION_HUB_TAG = "platform-setting:exhibition-hub";

/* ── News ticker speed ──────────────────────────────────────────────────
 * Seconds for one full marquee pass. Higher = slower. Adjustable without a
 * deploy because the right value depends on how many items are live and how
 * long they are, which changes every time the ticker is edited.
 */
export interface TickerSpeedSetting {
  /** Duration of one loop, in seconds. */
  seconds: number;
}

/** 90s reads comfortably at the current item count; 30s was too fast to follow. */
export const TICKER_SPEED_DEFAULT: TickerSpeedSetting = { seconds: 90 };

/** Clamped: 0 would freeze the animation and a huge value stalls it entirely. */
export function normalizeTickerSpeed(raw: unknown): TickerSpeedSetting {
  const v = (raw ?? {}) as Partial<TickerSpeedSetting>;
  const n = Number(v.seconds);
  return {
    seconds: Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 10), 600) : TICKER_SPEED_DEFAULT.seconds,
  };
}

/* ── Mail throughput ────────────────────────────────────────────────────
 * How fast a campaign is allowed to go out. Adjustable without a deploy
 * because the right number depends on what the email provider will tolerate,
 * which is discovered in production rather than known in advance.
 */
export interface MailThroughputSetting {
  /** Ceiling on messages sent per rolling hour, across the whole platform. */
  emailsPerHour: number;
  /** Messages the drain attempts per invocation. Derived from the hourly rate
   *  and the scheduler's interval, but pinnable for a slow first run. */
  batchSize: number;
}

/** 300/hour is the agreed default: safe for the current Resend plan, and with a
 *  five-minute scheduler that lands at 25 messages per invocation. */
export const MAIL_THROUGHPUT_DEFAULT: MailThroughputSetting = {
  emailsPerHour: 300,
  batchSize: 25,
};

/** Clamped hard: a typo of 300000 here would get the sending domain blocklisted. */
export function normalizeMailThroughput(raw: unknown): MailThroughputSetting {
  const v = (raw ?? {}) as Partial<MailThroughputSetting>;
  const perHour = Number(v.emailsPerHour);
  const batch = Number(v.batchSize);
  return {
    emailsPerHour: Number.isFinite(perHour) ? Math.min(Math.max(Math.round(perHour), 1), 5000) : MAIL_THROUGHPUT_DEFAULT.emailsPerHour,
    batchSize: Number.isFinite(batch) ? Math.min(Math.max(Math.round(batch), 1), 200) : MAIL_THROUGHPUT_DEFAULT.batchSize,
  };
}

export interface MaintenanceSetting {
  enabled: boolean;
  headline: string;
  message: string;
  /** Free text, e.g. "back by 6pm WAT". Empty string = show nothing. */
  etaText: string;
  /** Extra emails allowed straight through, beyond admins. Lowercased. */
  allowEmails: string[];
}

/** Defaults mirror the copy baked into app/maintenance/page.tsx, so an admin who
 *  never edits the text sees exactly the designed page. */
export const MAINTENANCE_DEFAULT: MaintenanceSetting = {
  enabled: false,
  headline: "We’ll be back shortly",
  message:
    "Nomarc Projects is offline for a short, planned update — we’re putting the finishing touches on some improvements. Your account and data are safe, and everything will be exactly where you left it.",
  etaText: "",
  allowEmails: [],
};

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizeMaintenance(raw: unknown): MaintenanceSetting {
  const v = (raw ?? {}) as Partial<MaintenanceSetting>;
  return {
    enabled: v.enabled === true,
    headline: typeof v.headline === "string" && v.headline.trim() ? v.headline : MAINTENANCE_DEFAULT.headline,
    message: typeof v.message === "string" && v.message.trim() ? v.message : MAINTENANCE_DEFAULT.message,
    etaText: typeof v.etaText === "string" ? v.etaText : "",
    allowEmails: Array.isArray(v.allowEmails)
      ? v.allowEmails.filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [],
  };
}

/* ── Exhibition Hub availability ────────────────────────────────────────
 * Decides whether the public marketplace (browse, product detail, compare,
 * cart and checkout) is open to everyone. When OFF, non-admin visitors land on
 * the Coming Soon screen; admins always get through. Admin-editable like the
 * other platform settings so the launch date isn't a deploy.
 */
export interface ExhibitionHubSetting {
  /** True = the hub is open to all visitors. False = non-admins see Coming Soon. */
  enabled: boolean;
}

/** Default: the hub starts locked (Coming Soon) until a super admin opens it. */
export const EXHIBITION_HUB_DEFAULT: ExhibitionHubSetting = { enabled: false };

/** Coerce whatever is in the jsonb column into a complete, safe object. */
export function normalizeExhibitionHub(raw: unknown): ExhibitionHubSetting {
  const v = (raw ?? {}) as Partial<ExhibitionHubSetting>;
  return {
    enabled: v.enabled === true,
  };
}
