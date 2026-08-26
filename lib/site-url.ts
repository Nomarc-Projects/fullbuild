/**
 * The one place the app decides what its own origin is.
 *
 * Password-reset links were arriving pointing at `nomarc-gigs.vercel.app`, because
 * both Better Auth's `baseURL` and the mailer's link builder read
 * `BETTER_AUTH_URL || AUTH_URL` straight from the environment, and the value
 * configured on Vercel is the deployment URL rather than the custom domain. Every
 * link in every email inherited it: reset, verification, unsubscribe, campaign
 * CTAs and the invoice logo.
 *
 * In production the canonical domain wins outright, so a stale or wrong env var
 * cannot send real users to a deployment URL. Everywhere else (previews, local)
 * the environment still decides, which is what previews need — Better Auth trusts
 * each preview's own `VERCEL_URL` as an origin.
 *
 * NOT importing "server-only": lib/auth.ts pulls this in, and that module is also
 * loaded by plain Node scripts outside Next's bundler.
 */
/**
 * `www` — the host that actually serves. The apex 308-redirects to it:
 *
 *   curl -I https://nomarcprojects.com/      → 308 → https://www.nomarcprojects.com/
 *   curl -I https://www.nomarcprojects.com/  → 200
 *
 * This matters because Better Auth takes it as `baseURL`, which fixes the
 * Google OAuth redirect_uri. Pointing it at the apex sends Google's callback
 * to a URL that immediately redirects, and the OAuth state cookie set before
 * the hop does not survive the host change — sign-in completes at Google and
 * the user lands back signed-out.
 *
 * Do not "correct" this to the apex to match sitemap.ts/robots.ts/layout.tsx
 * without first re-checking the redirect direction above. It has been changed
 * in both directions already; the curl is the only thing that settles it.
 */
export const PRODUCTION_ORIGIN = "https://www.nomarcprojects.com";

const strip = (u: string) => u.replace(/\/$/, "");
export const stripTrailingSlash = strip;

export function resolveSiteUrl(): string {
  // VERCEL_ENV is "production" only for the production deployment, not previews.
  if (process.env.VERCEL_ENV === "production") {
    // A fresh Vercel deploy serves from the project alias (*.vercel.app) until
    // DNS cutover — trust whatever host Vercel says is live, not the hardcoded
    // eventual domain. NEXT_PUBLIC_SITE_URL wins when set (custom-domain pin);
    // VERCEL_PROJECT_PRODUCTION_URL is Vercel-injected and tracks the project's
    // own production domain, custom or not. AUTH_URL/BETTER_AUTH_URL are
    // deliberately ignored here: on Vercel those were the per-deployment URL,
    // which is how reset links once went out pointing at nomarc-gigs.vercel.app.
    const pinned = process.env.NEXT_PUBLIC_SITE_URL;
    if (pinned) return strip(pinned);
    const injected = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (injected) return `https://${strip(injected.replace(/^https?:\/\//, ""))}`;
    return PRODUCTION_ORIGIN;
  }

  const explicit = process.env.BETTER_AUTH_URL || process.env.AUTH_URL;
  if (explicit) return strip(explicit);

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // Local dev, and any Node script run without the env set.
  return process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : "http://localhost:3000";
}

/** Client-safe canonical origin. `resolveSiteUrl()` reads `process.env.*` at
 *  module scope, which only resolves server-side; this gives client components
 *  the same canonical host without leaking server-only env. Falls back to the
 *  browser origin so previews and local dev still work. */
export const CLIENT_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL
  || (typeof window !== "undefined" ? window.location.origin : "")
  || PRODUCTION_ORIGIN;
