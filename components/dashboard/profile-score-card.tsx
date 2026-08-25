"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, ChevronRight, Camera, Star } from "lucide-react";
import type { OnboardingChecklist } from "@/lib/services/onboarding";

/* ─── Circular score ring ─────────────────────────────────────────────── */
function ScoreRing({ score, size = 88, onBanner = false }: { score: number; size?: number; onBanner?: boolean }) {
  const strokeW = size < 68 ? 4 : 5;
  const r = (size / 2) - (strokeW + 2);
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const colour = onBanner ? "#1e1e1e" : (score >= 80 ? "#22c55e" : score >= 50 ? "#ffd716" : "#f97316");
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeW}
          stroke={onBanner ? "rgba(0,0,0,0.18)" : "currentColor"}
          className={onBanner ? "" : "text-[#f0f0f0] dark:text-white/10"} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeW}
          strokeLinecap="round" stroke={colour}
          strokeDasharray={c} strokeDashoffset={offset}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="text-center z-10">
        <p className={`font-black leading-none ${onBanner ? "text-[#1e1e1e]" : "text-[#1e1e1e] dark:text-white"}`}
          style={{ fontSize: size * 0.23 }}>{score}</p>
        <p style={{ fontSize: Math.max(size * 0.11, 8) }}
          className={onBanner ? "text-black/50 font-medium mt-0.5" : "text-[#9a9a9a] font-medium mt-0.5"}>score</p>
      </div>
    </div>
  );
}

/* ─── Aspect bar ──────────────────────────────────────────────────────── */
function AspectBar({ label, value, max = 100, href }: { label: string; value: number; max?: number; href: string }) {
  const pct = Math.round((value / max) * 100);
  const colour = pct >= 80 ? "bg-[#22c55e]" : pct >= 50 ? "bg-[#ffd716]" : "bg-[#f97316]";
  return (
    <Link href={href} className="group flex items-center gap-3 hover:opacity-80 transition-opacity">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11.5px] font-medium text-[#6b6b6b] dark:text-white/60 truncate">{label}</span>
          <span className="text-[11px] font-bold text-[#1e1e1e] dark:text-white ml-2 flex-shrink-0">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${colour}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          />
        </div>
      </div>
      <ChevronRight size={13} className="text-[#c3c3c3] group-hover:text-[#ffd716] transition-colors flex-shrink-0" />
    </Link>
  );
}

/* ─── Props ───────────────────────────────────────────────────────────── */
interface ProfileScoreCardProps {
  checklist: OnboardingChecklist;
  name: string;
  role: string;
  avatarUrl?: string | null;
  kycTier?: number;
  skills?: string[];
}

/* ─── Component ───────────────────────────────────────────────────────── */
export function ProfileScoreCard({ checklist, name, role, avatarUrl, kycTier = 0, skills = [] }: ProfileScoreCardProps) {
  const { items, percent } = checklist;

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isVerified = kycTier >= 2;

  // Derive aspect scores from checklist items
  const photo      = items.find((i) => i.key === "photo" || i.key === "logo")?.done ?? false;
  const bio        = items.find((i) => i.key === "headline")?.done ?? false;
  const experience = items.find((i) => i.key === "experience" || i.key === "product")?.done ?? false;
  const skills_done = items.find((i) => i.key === "skills" || i.key === "cert")?.done ?? false;

  const aspects = role === "exhibitor"
    ? [
        { label: "Company Profile",   value: (photo ? 35 : 0) + (bio ? 35 : 0),               max: 70, href: "/dashboard/company" },
        { label: "Products Listed",   value: experience ? 100 : 0,                              max: 100, href: "/dashboard/my-products" },
        { label: "Certifications",    value: skills_done ? 100 : 0,                             max: 100, href: "/dashboard/company?tab=credentials" },
      ]
    : [
        { label: "Profile Info",      value: (photo ? 35 : 0) + (bio ? 35 : 0),               max: 70, href: "/dashboard/profile" },
        { label: "Work Experience",   value: experience ? 100 : 0,                              max: 100, href: "/dashboard/profile?tab=qualifications" },
        { label: "Skills",            value: skills_done ? 100 : 0,                             max: 100, href: "/dashboard/profile?tab=qualifications" },
      ];

  const pendingItems = items.filter((i) => !i.done).slice(0, 3);

  const editHref = "/dashboard/profile";

  return (
    <div className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] overflow-hidden">
      {/* Yellow band — taller, score ring lives here */}
      <div className="h-28 bg-gradient-to-br from-[#ffd716] via-[#e6c114] to-[#c9a800] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #fff 0%, transparent 60%)" }} />
        {/* Decorative circles */}
        <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-6 left-12 w-28 h-28 rounded-full bg-black/5 pointer-events-none" />
        {/* Score ring — inside the yellow band */}
        <div className="absolute bottom-3 right-4">
          <ScoreRing score={percent} size={58} onBanner />
        </div>
      </div>

      {/* Avatar + Edit Profile */}
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between -mt-9 mb-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-[72px] h-[72px] rounded-full border-4 border-white dark:border-[#1e1e1e] overflow-hidden bg-[#1e1e1e] flex items-center justify-center shadow-md">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[22px] font-black text-[#ffd716]">{initials}</span>
              )}
            </div>
            {!avatarUrl && (
              <Link href={editHref}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#ffd716] flex items-center justify-center border-2 border-white dark:border-[#1e1e1e] hover:scale-110 transition-transform">
                <Camera size={11} className="text-[#1e1e1e]" />
              </Link>
            )}
          </div>
          {/* Edit Profile button */}
          <Link href={editHref}
            className="mb-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1e1e1e] dark:bg-white text-white dark:text-[#1e1e1e] text-[12px] font-semibold hover:opacity-85 transition-opacity">
            Edit Profile
          </Link>
        </div>

        {/* Name + verification */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[16px] font-bold text-[#1e1e1e] dark:text-white leading-tight">{name}</h2>
            {isVerified && (
              <BadgeCheck size={16} className="text-[#3b82f6] flex-shrink-0" />
            )}
          </div>
          <p className="text-[12px] text-[#9a9a9a] dark:text-white/50 mt-0.5 capitalize">
            {role === "exhibitor" ? "Verified Exhibitor" : "Professional"}
            {kycTier > 0 && <> · <span className="text-[#ffd716]">Tier {kycTier}</span></>}
          </p>
        </div>

        {/* Skills chips (professional only) */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.slice(0, 5).map((s) => (
              <span key={s} className="text-[11px] font-medium bg-[#f4f4f4] dark:bg-white/10 text-[#6b6b6b] dark:text-white/60 rounded-full px-2.5 py-0.5">
                {s}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="text-[11px] font-medium text-[#9a9a9a] px-2 py-0.5">+{skills.length - 5}</span>
            )}
          </div>
        )}

        {/* Aspect breakdown */}
        <div className="space-y-3 mb-4">
          {aspects.map((a) => (
            <AspectBar key={a.label} label={a.label} value={a.value} max={a.max} href={a.href} />
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#f0f0f0] dark:border-white/10 my-4" />

        {/* Next actions */}
        {pendingItems.length > 0 ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9a9a9a] dark:text-white/40 mb-2.5">Next steps</p>
            <ul className="space-y-1.5">
              {pendingItems.map((item) => (
                <li key={item.key}>
                  <Link href={item.href}
                    className="group flex items-center gap-2.5 text-[12.5px] text-[#6b6b6b] dark:text-white/60 hover:text-[#1e1e1e] dark:hover:text-white transition-colors">
                    <div className="w-4 h-4 rounded-full border-2 border-[#e3e3e3] dark:border-white/20 group-hover:border-[#ffd716] transition-colors flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12.5px] text-[#22c55e] font-semibold">
            <Star size={14} fill="currentColor" />
            Profile complete — get verified!
          </div>
        )}

        {/* KYC CTA */}
        {kycTier < 2 && (
          <Link
            href="/dashboard/profile?tab=verification"
            className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#ffd716]/15 dark:bg-[#ffd716]/10 hover:bg-[#ffd716]/25 dark:hover:bg-[#ffd716]/20 px-4 py-3 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <BadgeCheck size={16} className="text-[#ffd716]" />
              <div>
                <p className="text-[12.5px] font-bold text-[#1e1e1e] dark:text-white">Get Nomarc Verified</p>
                <p className="text-[11px] text-[#9a9a9a] dark:text-white/50">Earn the blue seal — 3 tiers</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-[#9a9a9a] group-hover:text-[#ffd716] transition-colors" />
          </Link>
        )}
      </div>
    </div>
  );
}
