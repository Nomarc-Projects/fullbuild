"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Building2, ShieldCheck, ChevronRight, type LucideIcon } from "lucide-react";
import { EmployerProfileForm } from "@/components/profile/employer-profile-form";
import { KycView, VerificationLevelCard } from "@/components/dashboard/kyc-view";
import { StatusBadge } from "@/components/dashboard/kit/status-badge";
import { cn } from "@/lib/utils";
import type { EmployerProfileData } from "@/lib/services/employer";
import type { OnboardingChecklist } from "@/lib/services/onboarding";
import type { KycState } from "@/lib/services/kyc";

const TABS: { key: "profile" | "verification"; label: string; title: string; Icon: LucideIcon }[] = [
  { key: "profile", label: "Hiring Profile", title: "Hiring profile", Icon: Building2 },
  { key: "verification", label: "Verification", title: "Verification", Icon: ShieldCheck },
];
type Key = (typeof TABS)[number]["key"];

/**
 * The employer's own profile screen.
 *
 * Deliberately the same shape as the professional one (header, completeness card
 * with clickable outstanding items, verification card, section rail) so the two
 * roles feel like one product — but every item in it is an employer's: company
 * name, description, logo, phone verification, first job. No occupation, no
 * skills, no education.
 */
export function EmployerProfileShell({
  employer,
  checklist,
  kycState,
  initialTab = "profile",
}: {
  employer: EmployerProfileData;
  checklist: OnboardingChecklist | null;
  kycState?: KycState;
  initialTab?: Key;
}) {
  const [tab, setTab] = useState<Key>(initialTab);
  const active = TABS.find((t) => t.key === tab)!;
  const pct = checklist?.percent ?? 0;
  const outstanding = (checklist?.items ?? []).filter((i) => !i.done);
  const displayName = employer.name || "Your company";

  const select = (k: Key) => {
    setTab(k);
    window.history.replaceState(null, "", k === "profile" ? "/dashboard/profile" : "/dashboard/profile?tab=verification");
  };

  return (
    <div className="min-h-full bg-white dark:bg-[#161616]">
      <div className="mx-auto max-w-[1400px] px-6 pb-24 pt-12">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={employer.avatarUrl || "/logos/mark-on-light.png"}
            alt={displayName}
            className={cn("h-12 w-12 rounded-full", employer.avatarUrl ? "object-cover" : "object-contain bg-white p-2.5 dark:bg-white")}
          />
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold leading-tight md:text-[28px]">
              <span>
                <span className="text-[#9a9a9a]">{displayName}</span>{" "}
                <span className="text-[#1e1e1e] dark:text-white">/ {active.title}</span>
              </span>
              {kycState?.isFullyVerified && <StatusBadge tone="blue"><BadgeCheck size={13} /> Verified</StatusBadge>}
            </h1>
            <p className="mt-0.5 text-sm text-[#9a9a9a]">Show candidates who they would be working for</p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#e8e8e8] bg-white px-5 py-4 dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">
                  Your hiring profile is {pct}% complete{pct === 100 ? "! 🎉" : "!"}
                </p>
                {outstanding.length === 0 ? (
                  <p className="mt-0.5 text-[13px] text-[#9a9a9a]">All set, so candidates see a complete profile.</p>
                ) : (
                  <>
                    <p className="mt-0.5 text-[13px] text-[#9a9a9a]">Still to do:</p>
                    <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1.5">
                      {outstanding.map((m) => (
                        <li key={m.key}>
                          <Link
                            href={m.href}
                            className="inline-flex items-center gap-1 rounded-full border border-[#e8e8e8] px-2.5 py-1 text-[12px] font-medium text-[#4a4a4a] transition-colors hover:border-[#ffd716] hover:text-[#1e1e1e] dark:border-white/12 dark:text-white/70 dark:hover:text-white"
                          >
                            {m.label}
                            {m.optional && <span className="text-[#9a9a9a]">(optional)</span>}
                            <ChevronRight size={12} className="text-[#9a9a9a]" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
              <div className="h-full rounded-full bg-[#ffd716] transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {kycState && <VerificationLevelCard kycState={kycState} />}
        </div>

        <div className="mt-7 flex flex-col gap-6 md:flex-row">
          <nav className="flex-shrink-0 md:w-[220px]" aria-label="Profile sections">
            <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {TABS.map((t) => {
                const isActive = t.key === tab;
                return (
                  <button
                    key={t.key}
                    onClick={() => select(t.key)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-left text-[13.5px] transition-colors",
                      isActive
                        ? "bg-[#fffbe6] font-semibold text-[#1e1e1e] dark:bg-white/[0.06] dark:text-white"
                        : "text-[#6b6b6b] hover:bg-[#fafafa] dark:text-white/60 dark:hover:bg-white/[0.03]",
                    )}
                  >
                    <t.Icon size={16} className={isActive ? "text-[#caa400]" : "text-[#9a9a9a]"} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            <div className={tab === "profile" ? "" : "hidden"}>
              <EmployerProfileForm initial={employer} />
            </div>
            <div className={tab === "verification" ? "" : "hidden"}>
              {kycState && <KycView kycState={kycState} embedded />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
