import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getMaintenancePublic } from "@/lib/services/platform-settings-read";

export const metadata = {
  title: "Scheduled maintenance — Nomarc Projects",
  description: "Nomarc Projects is briefly offline for scheduled maintenance. We'll be back shortly.",
  robots: { index: false, follow: false },
};

// The headline/message/ETA are admin-editable, so this can't be prerendered.
export const dynamic = "force-dynamic";

/**
 * Scheduled-maintenance screen. No session and no dashboard chrome — it has to
 * render when the things behind it are the reason someone is seeing it. The one
 * read it does make, `getMaintenance()`, is guaranteed non-throwing: it swallows
 * its own errors and falls back to the copy below, so a database outage still
 * produces this page rather than an error boundary.
 *
 * The illustration sits in a tinted, rounded frame rather than bare on the page.
 * The source GIF is drawn on white, so on a dark background it would otherwise
 * read as a glaring white slab; the frame plus a slight dark-mode dim keeps it
 * sitting in the page instead of punching a hole through it.
 */
export default async function MaintenancePage() {
  const maintenance = await getMaintenancePublic();

  // Don't strand anyone here after the toggle goes off — a stale tab or a
  // bookmarked /maintenance should land on the live site, not on a notice about
  // maintenance that has already finished.
  if (!maintenance.enabled) redirect("/");

  return (
    /* Sized against the viewport, not stacked at fixed sizes: `h-svh` (small
       viewport height) is the height with mobile browser chrome *shown*, so the
       page can't be pushed under an address bar that appears on scroll. The
       illustration is the only elastic element — it carries `min-h-0` and a
       viewport-relative cap so it absorbs every reduction in height, letting the
       text and buttons keep their size on a short screen instead of the whole
       column overflowing. Nothing here scrolls at any breakpoint. */
    <main className="relative flex h-svh min-h-[480px] flex-col items-center justify-center gap-[2vh] overflow-hidden bg-[#f9f9f9] px-5 py-[3vh] text-center dark:bg-[#111] sm:px-6">
      {/* Absolutely positioned so it can't add height to the centred column,
          which is budgeted to the viewport. There is no navbar on this page, so
          without it a visitor is stuck in whatever theme they arrived in. */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* tone="auto" (the default) already swaps the wordmark per theme. The
          wordmark carries the brand on a page with no navbar, so it takes the
          larger size and scales down only on the narrowest phones, where the
          height budget is tight. */}
      <Link href="/" aria-label="Nomarc Projects home" className="shrink-0">
        <Logo size="md" className="scale-90 sm:scale-100 lg:scale-110" />
      </Link>

      {/* The frame stays white in BOTH themes on purpose. The source GIF is drawn
          on solid white, so a frame that went dark left a hard white rectangle
          floating inside a near-transparent box — worse than no frame at all.
          Keeping it white turns the illustration into a deliberate card, and the
          softened dark-mode border stops it glaring against the dark page. */}
      <div className="flex min-h-0 w-full max-w-[230px] shrink items-center justify-center overflow-hidden rounded-3xl border border-[#ececec] bg-white dark:border-white/10 sm:max-w-[280px] lg:max-w-[320px]">
        {/* Animated GIF, so a plain <img>: next/image would need `unoptimized`
            to keep the animation, which buys nothing here. `object-contain`
            under a max-height in svh means it scales down on short viewports
            rather than forcing the page taller. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/maintenance.gif"
          alt=""
          aria-hidden="true"
          width={450}
          height={450}
          className="max-h-[30svh] w-full object-contain"
        />
      </div>

      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ffd716]/40 bg-[#fffdf2] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8a7400] dark:border-[#ffd716]/20 dark:bg-[#ffd716]/[0.06] dark:text-[#ffd716] sm:px-3.5 sm:py-1.5 sm:text-[11.5px]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#caa400] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#caa400]" />
        </span>
        Scheduled maintenance
      </span>

      <div className="shrink-0">
        <h1 className="max-w-[620px] text-[21px] font-bold leading-tight tracking-[-0.01em] text-[#1e1e1e] dark:text-white sm:text-[27px] lg:text-[30px]">
          {maintenance.headline}
        </h1>
        <p className="mt-2 max-w-[520px] text-[13px] leading-snug text-[#6b6b6b] dark:text-white/60 sm:mt-3 sm:text-[14.5px] sm:leading-relaxed">
          {maintenance.message}
        </p>
      </div>

      {maintenance.etaText ? (
        <p className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ececec] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1e1e1e] dark:border-white/10 dark:bg-white/[0.03] dark:text-white sm:px-4 sm:py-2 sm:text-[13px]">
          <Clock size={14} className="text-[#caa400] dark:text-[#ffd716]" />
          {maintenance.etaText}
        </p>
      ) : null}

      {/* Side by side even on the narrowest phone: two short labels stack to
          ~100px of height for no benefit, and that is the difference between
          fitting a 640px-tall screen and not. */}
      <div className="flex shrink-0 flex-row items-center justify-center gap-2.5 sm:gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-[#ffd716] px-5 py-2.5 text-[13px] font-bold text-[#1e1e1e] transition-colors hover:bg-[#e6c114] sm:px-6 sm:py-3 sm:text-[13.5px]"
        >
          Try again
        </Link>
        {/* info@, not support@ — support@nomarcprojects.com is not one of the
            mailboxes provisioned on the mail server, so it would hard-bounce. */}
        <a
          href="mailto:info@nomarcprojects.com"
          className="inline-flex items-center justify-center rounded-xl border border-[#e3e3e3] px-5 py-2.5 text-[13px] font-semibold text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/15 dark:text-white sm:px-6 sm:py-3 sm:text-[13.5px]"
        >
          Contact support
        </a>
      </div>

      <p className="shrink-0 text-[11.5px] text-[#9a9a9a] sm:text-[12px]">
        &copy; {new Date().getFullYear()} Nomarc Projects by Nomadic Architects.
      </p>
    </main>
  );
}
