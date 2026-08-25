import "server-only";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email/mailer";
import { applyShortcodes } from "@/lib/email/shortcodes";
import { unsubscribeUrlFor } from "@/lib/email/unsubscribe";
import { withTracking } from "@/lib/email/tracking";

/* ── Campaign drain ─────────────────────────────────────────────────────
 * Deliberately NOT in ./campaigns.ts. That file is "use server", where every
 * export becomes a callable server-action endpoint — publishing `drainCampaign`
 * there would let any unauthenticated caller who knew the action id force a
 * queued blast out at full speed, straight past the configured rate ceiling.
 * `server-only` makes importing this from a client component a build error, and
 * the single caller is a secret-guarded route handler.
 *
 * Queueing (super-admin gated) stays in ./campaigns.ts as `startCampaignSend`;
 * this module only moves already-approved work.
 */

type QueuedCampaign = {
  subject: string;
  previewText: string | null;
  fromName: string | null;
  replyTo: string | null;
  bodyHtml: string;
  status: string;
};

/** How many times a transient failure is retried before the recipient is
 *  marked permanently failed. Bounded so one bad SMTP stretch can't pin the
 *  queue behind a single address forever. */
const MAX_ATTEMPTS = 3;

/**
 * Transient failures are worth a retry; hard bounces are not.
 *
 * Nodemailer surfaces SMTP errors as `Error` with the server response embedded
 * (e.g. "Mail command failed: 550 ..."). 5xx server/connection-class failures
 * and connection/timeout errors can clear up on the next tick; a 4xx
 * (especially 550/551/552/553 — unknown user, mailbox full, bad address) means
 * the address itself is the problem and retrying it just stalls the queue.
 */
function isTransient(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return (
    /timeout|timed out|ECONN|EAI_AGAIN|ETIMEDOUT|socket/i.test(m) ||
    /5\d\d/.test(m) ||
    /too many connections|connection/i.test(m)
  ) && !/4\d\d/.test(m);
}

/** Session-free read; getCampaign() in campaigns.ts requires an admin. */
async function readCampaign(id: string): Promise<QueuedCampaign | null> {
  const res = await db.execute(sql`
    SELECT subject, preview_text, from_name, reply_to, body_html, status
    FROM email_campaign WHERE id = ${id} LIMIT 1
  `);
  const r = res.rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    subject: String(r.subject ?? ""),
    previewText: r.preview_text ? String(r.preview_text) : null,
    fromName: r.from_name ? String(r.from_name) : null,
    replyTo: r.reply_to ? String(r.reply_to) : null,
    bodyHtml: String(r.body_html ?? ""),
    status: String(r.status ?? ""),
  };
}

/** Campaigns still queued, least-recently-touched first so none starves. */
export async function pendingCampaignIds(): Promise<string[]> {
  const res = await db.execute(sql`
    SELECT id FROM email_campaign WHERE status = 'sending' ORDER BY updated_at LIMIT 5
  `);
  return (res.rows as { id: string }[]).map((r) => r.id);
}

/**
 * Send the next slice of a queued campaign.
 *
 * Bounded and idempotent: an invocation that is killed partway simply leaves the
 * remaining rows 'pending' for the next tick. This is what makes a six-hour,
 * rate-limited send survive without anyone holding a browser tab open, and what
 * stops a retry re-mailing everybody who already received it.
 */
export async function drainCampaign(id: string, limit: number): Promise<{ sent: number; failed: number; remaining: number }> {
  const c = await readCampaign(id);
  if (!c || c.status !== "sending") return { sent: 0, failed: 0, remaining: 0 };

  const pending = await db.execute(sql`
    SELECT d.user_id, d.email, u.name, COALESCE(d.attempts, 0) AS attempts
    FROM email_campaign_delivery d
    LEFT JOIN "user" u ON u.id = d.user_id
    WHERE d.campaign_id = ${id} AND d.status = 'pending'
      AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= now())
    ORDER BY d.created_at
    LIMIT ${limit}
  `);
  const rows = pending.rows as { user_id: string; email: string; name: string | null; attempts: number }[];

  const baseUrl = siteUrl();
  let sent = 0;
  let failed = 0;

  // Sequential, not Promise.all: the transport's own pool and rate limit are what
  // pace this, and firing the whole slice at once would just queue inside
  // nodemailer while making a partial failure harder to attribute.
  for (const r of rows) {
    const unsubscribeUrl = unsubscribeUrlFor(r.user_id);
    try {
      await sendEmail({
        to: r.email,
        subject: c.subject,
        html: emailLayout({
          heading: c.subject,
          body: withTracking(
            applyShortcodes(c.bodyHtml, { id: r.user_id, email: r.email, name: r.name }, { baseUrl, unsubscribeUrl }),
            id,
            r.user_id,
          ),
          preheader: c.previewText ?? undefined,
          unsubscribeUrl,
        }),
        fromName: c.fromName ?? undefined,
        replyTo: c.replyTo ?? undefined,
      });
      await db.execute(sql`
        UPDATE email_campaign_delivery SET status = 'sent', sent_at = now(), error = NULL
        WHERE campaign_id = ${id} AND user_id = ${r.user_id}
      `);
      sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "send failed";
      const attempts = Number(r.attempts) + 1;
      // A transient failure gets bounded backoff and stays pending; a hard
      // bounce (4xx, e.g. unknown user) is marked failed immediately so it
      // can't stall the queue behind an address that will never accept mail.
      if (attempts < MAX_ATTEMPTS && isTransient(e)) {
        // Exponential backoff: 1 tick, 2 ticks, … (≈5 min and 10 min at the
        // default scheduler interval).
        await db.execute(sql`
          UPDATE email_campaign_delivery
          SET attempts = ${attempts}, error = ${message.slice(0, 500)},
              next_attempt_at = now() + (interval '5 minutes' * ${Math.pow(2, attempts - 1)})
          WHERE campaign_id = ${id} AND user_id = ${r.user_id}
        `);
      } else {
        await db.execute(sql`
          UPDATE email_campaign_delivery
          SET status = 'failed', attempts = ${attempts}, error = ${message.slice(0, 500)}, next_attempt_at = NULL
          WHERE campaign_id = ${id} AND user_id = ${r.user_id}
        `);
      }
      failed++;
    }
  }

  const counts = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE status = 'pending')::int AS pending,
      count(*) FILTER (WHERE status = 'sent')::int    AS sent,
      count(*) FILTER (WHERE status = 'failed')::int  AS failed
    FROM email_campaign_delivery WHERE campaign_id = ${id}
  `);
  const t = counts.rows[0] as { pending: number; sent: number; failed: number };
  const done = t.pending === 0;

  await db.execute(sql`
    UPDATE email_campaign
    SET sent_count = ${t.sent}, failed_count = ${t.failed},
        status = ${done ? (t.sent === 0 ? "failed" : "sent") : "sending"},
        sent_at = ${done ? sql`now()` : sql`sent_at`},
        updated_at = now()
    WHERE id = ${id}
  `);

  if (done) revalidatePath("/admin/email-campaigns");
  return { sent, failed, remaining: t.pending };
}
