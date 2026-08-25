"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, X, ChevronDown } from "lucide-react";
import type { OnboardingChecklist } from "@/lib/services/onboarding";

/** Mascot emoji that reacts to progress. */
function mascot(pct: number) {
  if (pct >= 100) return "🎉";
  if (pct >= 75) return "🏗️";
  if (pct >= 40) return "👷";
  return "🚧";
}

/** Lightweight CSS confetti burst (no dependency). */
function Confetti() {
  const bits = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 320,
    y: -(Math.random() * 220 + 60),
    rot: Math.random() * 360,
    delay: Math.random() * 0.15,
    color: ["#ffd716", "#1e1e1e", "#29e7ff", "#ff2d6b", "#16803c"][i % 5],
  })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: 0, x: b.x, y: b.y, rotate: b.rot }}
          transition={{ duration: 1.1, delay: b.delay, ease: "easeOut" }}
          style={{ left: "50%", top: "40%", background: b.color }}
          className="absolute w-2 h-2 rounded-[1px]"
        />
      ))}
    </div>
  );
}

export function ChecklistCard({ data }: { data: OnboardingChecklist }) {
  const { title, subtitle, items, percent } = data;
  const storageKey = `nm-onboarding-dismissed-${data.role}`;
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we read storage (avoids flash)
  const [collapsed, setCollapsed] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const wasDismissed = typeof window !== "undefined" && localStorage.getItem(storageKey) === "1";
    setDismissed(wasDismissed);
  }, [storageKey]);

  // celebrate once when reaching 100%
  useEffect(() => {
    if (percent === 100) {
      const celebratedKey = `${storageKey}-celebrated`;
      if (typeof window !== "undefined" && localStorage.getItem(celebratedKey) !== "1") {
        setCelebrate(true);
        localStorage.setItem(celebratedKey, "1");
        const t = setTimeout(() => setCelebrate(false), 1400);
        return () => clearTimeout(t);
      }
    }
  }, [percent, storageKey]);

  if (dismissed || items.length === 0) return null;

  const firstUndone = items.find((i) => !i.done);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e]">
      {celebrate && <Confetti />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.span key={mascot(percent)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="text-2xl">{mascot(percent)}</motion.span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">{percent === 100 ? "You're all set! 🎉" : title}</h3>
              <p className="text-[13px] text-[#9a9a9a]">{percent === 100 ? "Your profile is complete and discoverable." : subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setCollapsed((c) => !c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"><ChevronDown size={16} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} /></button>
            <button onClick={() => { localStorage.setItem(storageKey, "1"); setDismissed(true); }} title="Dismiss" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9a9a9a] hover:bg-[#f5f5f5] dark:hover:bg-white/5"><X size={15} /></button>
          </div>
        </div>

        {/* progress */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-[#f0f0f0] dark:bg-white/10 overflow-hidden">
            <motion.div className="h-full rounded-full bg-[#ffd716]" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.6 }} />
          </div>
          <span className="text-[13px] font-bold text-[#1e1e1e] dark:text-white tabular-nums">{percent}%</span>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-1.5">
              {items.map((it, i) => {
                const isNext = it === firstUndone;
                return (
                  <motion.li key={it.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={it.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isNext ? "bg-[#fffdf2] dark:bg-[#ffd716]/[0.06] border border-[#ffd716]/40" : "hover:bg-[#f7f7f7] dark:hover:bg-white/5"}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${it.done ? "bg-[#16803c] text-white" : "border-2 border-[#d4d4d4] dark:border-white/20"}`}>{it.done && <Check size={12} />}</span>
                      <span className={`flex-1 text-[13px] ${it.done ? "text-[#9a9a9a] line-through" : "text-[#1e1e1e] dark:text-white font-medium"}`}>{it.label}</span>
                      {isNext && <span className="text-[12px] font-semibold text-[#caa400] inline-flex items-center gap-1">Do it <ArrowRight size={13} /></span>}
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
