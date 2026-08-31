// NOTE: intentionally NOT importing "server-only" — this module is pulled in by
// lib/auth.ts, which is also loaded by Node scripts (e.g. the legacy importer)
// outside Next's bundler where the "server-only" shim can't resolve. It is only
// ever imported by server code, so the guard is unnecessary here.
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { resolveSiteUrl } from "@/lib/site-url";

/**
 * Transactional email via Resend (default when RESEND_API_KEY is set), falling
 * back to the Nomarc SMTP server (site4now) otherwise.
 *
 * Config comes from env (Doppler → Render/Vercel), never hardcoded:
 *   RESEND_API_KEY   — Resend API key; enables the Resend provider
 *   RESEND_FROM      — optional sender override; defaults to EMAIL_FROM
 *   SMTP_HOST, SMTP_PORT (465), SMTP_SECURE ("true"), SMTP_USER, SMTP_PASS,
 *   EMAIL_FROM       e.g.  "Nomarc <info@nomarcprojects.com>"
 *
 * Resend is preferred: it's what the product is moving to and needs no SMTP
 * credentials. If neither Resend nor SMTP is configured (e.g. a preview env),
 * we log and no-op instead of throwing, so auth flows never hard-fail.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.EMAIL_FROM || "Nomarc Projects <info@nomarcprojects.com>";
const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT || 465);
const SECURE = (process.env.SMTP_SECURE ?? "true") !== "false";
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
export const EMAIL_FROM = process.env.EMAIL_FROM || "Nomarc Projects <info@nomarcprojects.com>";

export const isResendConfigured = Boolean(RESEND_API_KEY);
export const isMailConfigured = Boolean(HOST && USER && PASS);
export const isEmailConfigured = isResendConfigured || isMailConfigured;

let resend: Resend | null = null;
function getResend() {
  if (!isResendConfigured) return null;
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

/**
 * Transport-level guardrails, overridable via env if the provider's real limits
 * turn out to differ. Deliberately conservative: exceeding a shared SMTP host's
 * concurrency gets the sending domain throttled or blocklisted, and recovering a
 * domain's reputation takes far longer than a slow send.
 */
const MAX_CONNECTIONS = Math.max(1, Number(process.env.SMTP_MAX_CONNECTIONS || 3));
const MAX_PER_SECOND = Math.max(1, Number(process.env.SMTP_MAX_PER_SECOND || 5));

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!isMailConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: SECURE, // true for 465 (implicit TLS)
      auth: { user: USER, pass: PASS },
      // Without these, an unreachable SMTP host hangs until the serverless
      // function is killed, and the caller sees a platform 504 rather than a
      // mail error. Fail fast instead.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      // Connection reuse + throttling. Previously unset, which meant a fresh TLS
      // handshake per message and, in the campaign path, 20 of them at once.
      // Shared SMTP hosts typically cap concurrent connections near 5, so a
      // blast produced "too many connections" failures rather than mail.
      //
      // These bound how hard we hit the SMTP server. The campaign-level ceiling
      // (messages per hour) is a separate, admin-configurable setting; this is
      // the floor beneath it, so even a mis-set rate cannot open 50 sockets.
      pool: true,
      maxConnections: MAX_CONNECTIONS,
      maxMessages: 100,
      rateDelta: 1_000,
      rateLimit: MAX_PER_SECOND,
    });
  }
  return transporter;
}

/**
 * `fromName` / `replyTo` exist for admin email campaigns, which let the sender
 * be branded per campaign. The envelope address still comes from EMAIL_FROM —
 * only the display name is overridable, since a From address outside the
 * authenticated SMTP domain would fail SPF/DKIM and land in spam.
 */
export async function sendEmail({ to, subject, html, text, fromName, replyTo }: {
  to: string; subject: string; html: string; text?: string; fromName?: string; replyTo?: string;
}) {
  const from = fromName?.trim()
    ? `${fromName.trim().replace(/["<>\r\n]/g, "")} <${EMAIL_FROM.match(/<(.+)>/)?.[1] ?? EMAIL_FROM}>`
    : EMAIL_FROM;

  // Resend is the primary provider.
  const r = getResend();
  if (r) {
    await r.emails.send({
      from: RESEND_FROM,
      to,
      subject,
      html,
      text: text || stripHtml(html),
      replyTo: replyTo?.trim() || undefined,
    });
    return { skipped: false };
  }

  const t = getTransport();
  if (!t) {
    // In dev/preview a missing mailer is expected, so no-op rather than break
    // every auth flow. In production it means verification and password-reset
    // mail is silently vanishing — throw so it surfaces instead of leaving
    // users staring at "check your inbox" for mail that was never sent.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email not configured — refusing to silently drop email \"" + subject + "\"");
    }
    console.warn(`[mailer] no email provider configured (Resend/SMTP) — skipped email "${subject}" → ${to}`);
    return { skipped: true };
  }
  await t.sendMail({ from, to, subject, html, text: text || stripHtml(html), replyTo: replyTo?.trim() || undefined });
  return { skipped: false };
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Escape text before it goes into an email body.
 *
 * `emailLayout` interpolates its fields raw, which is right for the admin
 * broadcast/campaign paths that legitimately author HTML — but the Better Auth
 * templates were interpolating `user.name`, and a display name is chosen by
 * whoever signed up. A name containing markup rendered as HTML in the
 * recipient's mail client, on the password-reset email of all things. Escape
 * anything user-supplied at the call site.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SITE = resolveSiteUrl();
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Absolute site origin, no trailing slash. Exported so the mail paths that need
 *  to build links (shortcodes, unsubscribe) share one resolution instead of each
 *  keeping its own copy. */
export function siteUrl(): string {
  return SITE;
}

/** Support address. NOT support@ — that mailbox does not exist (see components/coming-soon.tsx). */
const SUPPORT_EMAIL = "info@nomarcprojects.com";

/**
 * Branded transactional email shell for Nomarc Projects.
 *
 * Colours: Nomarc Yellow #FFD716, Off-Black #1E1E1E, White, grey #F1F1F1.
 * Tables + inline styles only, because no external stylesheet and no modern
 * layout survives Outlook.
 *
 * The brand is an image (`/logos/wordmark-on-light.png`) rather than the text
 * lockup this used to render, and it must be an absolute URL: a relative path
 * resolves against nothing in a mail client. `alt` carries the name so the
 * header still reads when images are blocked, which is the common case in
 * Outlook and in Gmail's default for unknown senders.
 *
 * Deliberately no social icons: the only social URLs in the codebase are
 * placeholders (x.com, linkedin.com), and icons landing on a platform homepage
 * read as broken.
 *
 * `unsubscribeUrl` gates the unsubscribe line, so transactional mail (password
 * reset, sign-in codes) never invites the recipient to unsubscribe from the
 * thing keeping them in their account. Passing it also switches the footer's
 * "why am I getting this" wording from account-action to bulk.
 */
export function emailLayout(opts: {
  heading: string;
  body: string;
  /** Centred line under the heading, e.g. "Thank you for registering". */
  subheading?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Boxed callout under the CTA, for expiry/security notes. */
  notice?: { title: string; text: string };
  footnote?: string;
  eyebrow?: string;
  preheader?: string;
  /** Bulk mail only. Omit on transactional mail to hide the unsubscribe line. */
  unsubscribeUrl?: string;
}) {
  const { heading, body, subheading, ctaLabel, ctaUrl, notice, footnote, eyebrow, preheader, unsubscribeUrl } = opts;

  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</div>`
    : "";
  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#caa400;text-align:center;">${escapeHtml(eyebrow)}</p>`
    : "";
  const subheadingHtml = subheading
    ? `<p style="margin:0 0 4px;color:#6b6b6b;font-size:14.5px;line-height:1.6;text-align:center;">${escapeHtml(subheading)}</p>`
    : "";

  // Full-width button (the reference's is inline-width; ours fills the column).
  // display:block on the anchor inside a 100%-width cell is what makes Outlook
  // stretch it rather than shrink-wrapping the label.
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
         <tr><td align="center" style="border-radius:10px;background:#ffd716;">
           <a href="${ctaUrl}" style="display:block;padding:15px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:#1e1e1e;text-decoration:none;text-align:center;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>
       </table>`
    : "";

  const noticeHtml = notice
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
         <tr><td style="padding:16px 18px;background:#faf9f4;border:1px solid #ececec;border-radius:12px;">
           <p style="margin:0 0 4px;font-family:${FONT};font-size:13px;font-weight:700;color:#1e1e1e;">${escapeHtml(notice.title)}</p>
           <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.65;color:#6b6b6b;">${escapeHtml(notice.text)}</p>
         </td></tr>
       </table>`
    : "";

  const foot = footnote
    ? `<p style="margin:20px 0 0;color:#9a9a9a;font-size:12.5px;line-height:1.7;">${footnote}</p>`
    : "";

  const unsubscribeHtml = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color:#6b6b6b;text-decoration:underline;">Unsubscribe</a>
       &nbsp;&middot;&nbsp; `
    : "";

  const whyHtml = unsubscribeUrl
    ? "You received this email because you have a Nomarc Projects account."
    : "You received this email because an account action was requested for this address.";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#f1f1f1;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f1f1;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">

        <!-- logo -->
        <tr><td align="center" style="padding:36px 32px 22px;">
          <img src="${SITE}/logos/wordmark-on-light.png" alt="Nomarc Projects" width="168" style="display:block;width:168px;max-width:168px;height:auto;border:0;outline:none;text-decoration:none;font-family:${FONT};font-size:17px;font-weight:800;color:#1e1e1e;" />
        </td></tr>

        <!-- heading -->
        <tr><td style="padding:0 32px;font-family:${FONT};">
          ${eyebrowHtml}
          <h1 style="margin:0 0 8px;color:#1e1e1e;font-size:23px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;text-align:center;">${escapeHtml(heading)}</h1>
          ${subheadingHtml}
        </td></tr>

        <!-- body -->
        <tr><td style="padding:22px 32px 30px;font-family:${FONT};">
          <div style="color:#4b4b4b;font-size:15px;line-height:1.7;">${body}</div>
          ${cta}
          ${noticeHtml}
          ${foot}
        </td></tr>

        <!-- need help -->
        <tr><td style="padding:0 32px;">
          <div style="border-top:1px solid #ececec;"></div>
        </td></tr>
        <tr><td style="padding:24px 32px 30px;font-family:${FONT};">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1e1e1e;">Need help?</p>
          <p style="margin:0 0 10px;color:#6b6b6b;font-size:14px;line-height:1.6;">Our team is happy to help you get set up.</p>
          <p style="margin:0;font-size:14px;">
            <a href="mailto:${SUPPORT_EMAIL}" style="color:#1e1e1e;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a>
          </p>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:24px 32px;background:#fafafa;border-top:1px solid #ececec;font-family:${FONT};">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e1e1e;">Nomarc Projects</p>
          <p style="margin:0 0 14px;color:#9a9a9a;font-size:12.5px;line-height:1.6;">The digital home for Nigeria&rsquo;s construction ecosystem; find work, hire verified talent, source materials and manage projects, all in one place.</p>
          <p style="margin:0 0 12px;font-size:12.5px;">
            ${unsubscribeHtml}<a href="${SITE}/privacy" style="color:#6b6b6b;text-decoration:none;">Privacy Policy</a>
            &nbsp;&middot;&nbsp; <a href="${SITE}/terms" style="color:#6b6b6b;text-decoration:none;">Terms of Service</a>
          </p>
          <p style="margin:0;color:#b3b3b3;font-size:11px;line-height:1.6;">
            ${whyHtml}<br/>
            Operated by Nomadic Architects &middot; Lagos, Nigeria &middot; &copy; ${new Date().getFullYear()} Nomarc Projects. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}
