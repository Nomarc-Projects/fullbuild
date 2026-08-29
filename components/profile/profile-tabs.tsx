"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ThumbsUp, User, Award, GraduationCap, ShieldCheck, ChevronRight, type LucideIcon } from "lucide-react";
import { PublicProfileForm, DEFAULT_AVATAR } from "@/app/(marketing)/profile/public-profile-form";
import { QualificationsContent } from "@/app/(marketing)/profile/qualifications/qualifications-content";
import { EducationContent } from "@/app/(marketing)/profile/education/education-content";
import { KycView, VerificationLevelCard } from "@/components/dashboard/kyc-view";
import { StatusBadge } from "@/components/dashboard/kit/status-badge";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/lib/services/profile";
import type { ChecklistItem } from "@/lib/services/profile-checklist";
import type { Experience, Cert, Edu } from "@/lib/services/qualifications";
import type { KycState } from "@/lib/services/kyc";

type Named = { id: string; name: string };
type Quals = { experience: Experience[]; skills: Named[]; specializations: Named[]; certifications: Cert[]; endorsementsTotal?: number };

const TABS: { key: "public" | "qualifications" | "education" | "verification"; label: string; title: string; Icon: LucideIcon }[] = [
  { key: "public", label: "Public Profile", title: "Public profile", Icon: User },
  { key: "qualifications", label: "Qualifications", title: "Qualifications", Icon: Award },
  { key: "education", label: "Education History", title: "Education", Icon: GraduationCap },
  { key: "verification", label: "Verification", title: "Verification", Icon: ShieldCheck },
];
type Key = (typeof TABS)[number]["key"];

/**
 * Profile section as client-side tabs: switching Public/Qualifications/Education
 * is instant and preserves each form's state (all three stay mounted, inactive
 * ones hidden). No route change / reload within the section. Deep-linkable via
 * ?tab=… for shareable links; switching tabs only updates the URL shallowly.
 */
// Stable identity — an inline `= []` default allocates a new array every render
// and re-triggers child sync-effects (see education-content/qualifications).
const NO_MISSING: ChecklistItem[] = [];
const NO_EDU: Edu[] = [];

export function ProfileTabs({ initial = "public", profile, missing = NO_MISSING, quals, education = NO_EDU, kycState }: { initial?: Key; profile?: ProfileData; missing?: ChecklistItem[]; quals?: Quals; education?: Edu[]; kycState?: KycState }) {
  const router = useRouter();

  /**
   * A member only counts as a professional — and so only then sees the
   * Qualifications, Education History and Verification tabs — once they have
   * SIGNALLED an interest in finding work (Availability set to "Open to work")
   * and FILLED IN the job-find basics (occupation + bio). New accounts and
   * regular users start with none of that, so they get only the Public Profile
   * ("profile update") tab. The occupation list no longer drives this: a free
   * text occupation is now the norm, and intent + completed fields is the gate.
   */
  const isProfessional =
    profile?.availability === "open_to_work" &&
    !!profile?.headline?.trim() &&
    !!profile?.bio?.trim();

  // Non-professionals land on (and can only navigate to) the Public Profile tab
  // — no deep link should strand them on a hidden tab.
  const [tab, setTab] = useState<Key>(!isProfessional ? "public" : initial);
  const active = TABS.find((t) => t.key === tab)!;
  const pct = profile?.completeness ?? 0;
  const displayName = profile?.name || "Your profile";

  // The rail shows the professional tabs only to professionals.
  const visibleTabs = isProfessional ? TABS : TABS.filter((t) => t.key === "public");

  // The first thing still outstanding, so "Complete profile" goes somewhere
  // useful instead of always landing on the Public Profile tab even when what is
  // missing lives under Qualifications or Education.
  const firstOutstanding = missing[0];

  const select = (k: Key) => {
    setTab(k);
    // keep the URL in sync without a navigation/remount
    window.history.replaceState(null, "", k === "public" ? "/dashboard/profile" : `/dashboard/profile?tab=${k}`);
  };

  /**
   * Jump to whatever fixes a checklist item.
   *
   * Items on a profile tab switch in place, because these tabs are client state
   * and a real navigation would remount all three forms and lose anything typed.
   * Anything off-page (publishing a service) is a genuine navigation.
   */
  const goToItem = (item: ChecklistItem) => {
    if (item.tab) {
      select(item.tab as Key);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(item.href);
  };

  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* The mark needs contain + a light ground to read; an uploaded photo
              fills the circle. Mirrors the avatar row in PublicProfileForm. */}
          <img src={profile?.avatarUrl || DEFAULT_AVATAR} alt={displayName} className={`w-12 h-12 rounded-full ${profile?.avatarUrl ? "object-cover" : "object-contain p-2.5 bg-white dark:bg-white"}`} />
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold leading-tight flex items-center gap-2 flex-wrap">
              <span><span className="text-[#9a9a9a]">{displayName}</span>{" "}<span className="text-[#1e1e1e] dark:text-white">/ {active.title}</span></span>
              {profile?.verified && <StatusBadge tone="blue"><BadgeCheck size={13} /> Verified</StatusBadge>}
              {!!quals?.endorsementsTotal && <StatusBadge tone="yellow"><ThumbsUp size={12} /> {quals.endorsementsTotal} endorsements</StatusBadge>}
            </h1>
            <p className="text-sm text-[#9a9a9a] mt-0.5">Highlight your skills and experience</p>
          </div>
        </div>

        {/* Completeness + verification level — professional-only, two equal, responsive cards */}
        {isProfessional && (
        <div className={cn("mt-8 grid grid-cols-1 gap-4 items-stretch", kycState && "lg:grid-cols-2")}>
          <div className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-6 py-5 flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Your profile is {pct}% complete{pct === 100 ? "! 🎉" : "!"}</p>
                {missing.length === 0 ? (
                  <p className="text-[13px] text-[#9a9a9a] mt-0.5">Your profile is complete, so you&rsquo;re discoverable.</p>
                ) : (
                  <>
                    <p className="text-[13px] text-[#9a9a9a] mt-0.5">Still to do:</p>
                    {/* Every outstanding item, each a link to the tab that fixes
                        it. This was a comma-joined string truncated to four with
                        an ellipsis, so you could neither see what was left nor
                        act on any of it. */}
                    <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1.5">
                      {missing.map((m) => (
                        <li key={m.key}>
                          <button
                            type="button"
                            onClick={() => goToItem(m)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#e8e8e8] dark:border-white/12 px-2.5 py-1 text-[12px] font-medium text-[#4a4a4a] dark:text-white/70 hover:border-[#ffd716] hover:text-[#1e1e1e] dark:hover:text-white transition-colors"
                          >
                            {m.label}
                            {m.optional && <span className="text-[#9a9a9a]">(optional)</span>}
                            <ChevronRight size={12} className="text-[#9a9a9a]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              {pct < 100 && firstOutstanding && (
                <button onClick={() => goToItem(firstOutstanding)} className="self-start sm:self-auto whitespace-nowrap px-5 py-2.5 rounded-lg bg-[#ffd716] text-[#1e1e1e] text-sm font-semibold hover:bg-[#e6c114] transition-colors">Complete profile</button>
              )}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#ffd716] transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          </div>
          {kycState && <VerificationLevelCard kycState={kycState} />}
        </div>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
          <nav aria-label="Profile sections">
            {/* mobile: horizontal scroll */}
            <div className="md:hidden flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
              {visibleTabs.map((t) => {
                const active = t.key === tab;
                return (
                  <button key={t.key} type="button" onClick={() => select(t.key)} aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors flex-shrink-0 ${active ? "bg-[#ffd716]/15 dark:bg-[#ffd716]/10 text-[#1e1e1e] dark:text-white font-semibold" : "bg-white dark:bg-[#1e1e1e] text-[#6b6b6b] dark:text-white/50 hover:text-[#1e1e1e] dark:hover:text-white border border-[#e8e8e8] dark:border-white/10"}`}>
                    <t.Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
            {/* desktop: vertical card */}
            <div className="hidden md:block bg-white dark:bg-[#1e1e1e] rounded-xl border border-[#e8e8e8] dark:border-white/10 overflow-hidden">
              {visibleTabs.map((t) => {
                const active = t.key === tab;
                return (
                  <button key={t.key} type="button" onClick={() => select(t.key)} aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors border-b border-[#f0f0f0] dark:border-white/5 last:border-0 text-left ${active ? "bg-[#ffd716]/12 dark:bg-[#ffd716]/[0.08] text-[#1e1e1e] dark:text-white font-semibold border-l-[3px] border-l-[#ffd716]" : "text-[#6b6b6b] dark:text-white/50 hover:bg-[#f7f7f7] dark:hover:bg-white/[0.04] hover:text-[#1e1e1e] dark:hover:text-white pl-[18px]"}`}>
                    <t.Icon size={15} className={active ? "text-[#caa400]" : ""} /> {t.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="min-w-0">
            <div className={tab === "public" ? "" : "hidden"}><PublicProfileForm initial={profile} /></div>
            <div className={tab === "qualifications" ? "" : "hidden"}><QualificationsContent experience={quals?.experience} skills={quals?.skills} specializations={quals?.specializations} certifications={quals?.certifications} /></div>
            <div className={tab === "education" ? "" : "hidden"}><EducationContent education={education} /></div>
            <div className={tab === "verification" ? "" : "hidden"}>{kycState && <KycView kycState={kycState} embedded />}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── co-located loading skeleton ──────────────────────────────── */
export function ProfileTabsSkeleton() {
  const S = ({ cls = "" }: { cls?: string }) => <div className={`skeleton rounded-md ${cls}`} />;
  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="max-w-[1400px] mx-auto px-6 pt-12 pb-24">
        <div className="flex items-center gap-4">
          <S cls="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="space-y-1.5"><S cls="h-7 w-52" /><S cls="h-3.5 w-40" /></div>
        </div>
        <div className="mt-8 rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5"><S cls="h-4 w-44" /><S cls="h-3 w-64 max-w-full" /></div>
            <S cls="h-9 w-32 rounded-lg flex-shrink-0" />
          </div>
          <S cls="mt-3 h-1.5 w-full rounded-full" />
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10">
          <div className="space-y-1 rounded-xl border border-[#ececec] dark:border-white/10 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-3 border-b border-[#f0f0f0] dark:border-white/5 last:border-0">
                <S cls="w-4 h-4 rounded flex-shrink-0" /><S cls="h-3.5 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s} className="rounded-xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 space-y-4">
                <S cls="h-4 w-32" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2"><S cls="h-3 w-24" /><S cls="h-10 w-full rounded-xl" /></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
