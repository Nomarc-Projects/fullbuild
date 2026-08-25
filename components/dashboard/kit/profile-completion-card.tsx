"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompletionStep = { label: string; done: boolean; href?: string };

/**
 * "Your profile is N% complete!" card — yellow progress bar + a checklist of
 * remaining steps (green filled check = done, grey ring = to-do), and a
 * "Complete Profile" action. Collapsible. Drives onboarding on the dashboard home.
 */
export function ProfileCompletionCard({
  percent,
  steps,
  completeHref = "/dashboard/profile",
  className,
}: {
  percent: number;
  steps: CompletionStep[];
  completeHref?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(true);
  const pct = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={cn("rounded-2xl border border-[#ececec] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]", className)}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <p className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Your profile is {pct}% complete!</p>
          <p className="mt-0.5 text-[12.5px] text-[#9a9a9a]">Fill in all sections to unlock new opportunities and get discovered faster.</p>
        </div>
        <ChevronDown size={18} className={cn("mt-0.5 flex-shrink-0 text-[#9a9a9a] transition-transform", open && "rotate-180")} />
      </button>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-white/10">
        <motion.div
          className="h-full rounded-full bg-[#ffd716]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="mt-4 space-y-3">
              {steps.map((s) => {
                const row = (
                  <span className="flex items-center gap-2.5 text-[13.5px]">
                    {s.done ? (
                      <CheckCircle2 size={17} className="flex-shrink-0 text-[#1a7f43] dark:text-[#4ade80]" />
                    ) : (
                      <Circle size={17} className="flex-shrink-0 text-[#c9c9c9] dark:text-white/25" />
                    )}
                    <span className={cn(s.done ? "text-[#9a9a9a] line-through" : "text-[#3d3d3d] dark:text-white/75")}>{s.label}</span>
                  </span>
                );
                return (
                  <li key={s.label}>
                    {s.href && !s.done ? (
                      <Link href={s.href} className="transition-opacity hover:opacity-80">{row}</Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
              <li>
                <Link href={completeHref} className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#1e1e1e] dark:text-white">
                  <ArrowRight size={16} className="text-[#8a6d00] dark:text-[#ffd716]" />
                  Complete Profile
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
