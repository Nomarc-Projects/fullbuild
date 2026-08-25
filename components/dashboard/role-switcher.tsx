"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Briefcase, Store, Building2, Loader2, type LucideIcon } from "lucide-react";
import { useRoles } from "@/lib/roles-context";
import type { StackableRole } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

const META: Record<StackableRole, { label: string; icon: LucideIcon; blurb: string }> = {
  professional: { label: "Professional", icon: Briefcase, blurb: "Find work, apply & hire" },
  exhibitor: { label: "Exhibitor", icon: Store, blurb: "Sell products & materials" },
  employer: { label: "Employer", icon: Building2, blurb: "Post jobs & hire talent" },
};

/**
 * Control to switch which held role the dashboard shows. Renders only when
 * the viewer holds more than one stackable role — a single-role user has
 * nothing to switch to. Driven by the client RoleProvider.
 *
 * `variant="topbar"` (default) is the compact floating pill used in
 * `DashTopBar`. `variant="sidebar"` is a full-width "Switch role" row for
 * the sidebar footer (per the Figma redesign) — same logic, dropdown opens
 * upward since it sits near the bottom of the rail.
 */
export function RoleSwitcher({ variant = "topbar" }: { variant?: "topbar" | "sidebar" }) {
  const roles = useRoles();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /**
   * Shown from the FIRST role onward, not the second.
   *
   * This returned null below two held roles, which meant the control did not
   * exist at the moment it most needed explaining — right after someone acquired
   * their first role — and the welcome tour has a step pointing at it, so that
   * step had nothing to land on. With one role it still answers a real question
   * ("whose dashboard am I in") and shows what else is available.
   */
  if (!roles || roles.heldRoles.length === 0) return null;
  const active = (roles.activeRole in META ? roles.activeRole : roles.heldRoles[0]) as StackableRole;
  const Current = META[active].icon;
  const sidebar = variant === "sidebar";

  return (
    <div className={cn("relative", sidebar ? "w-full" : "mr-auto")} ref={ref}>
      {sidebar && <p className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Switch role</p>}
      <button
        onClick={() => setOpen((o) => !o)}
        data-tour="role-switcher"
        className={cn(
          "flex items-center gap-2 rounded-full border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#161616] hover:border-[#ffd716] transition-colors",
          sidebar ? "w-full pl-2 pr-3 py-2" : "pl-2 pr-2.5 py-1.5",
        )}
        title="Switch role"
      >
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#fff7cc] dark:bg-[#ffd716]/15">
          {roles.switching ? <Loader2 size={13} className="animate-spin text-[#1e1e1e] dark:text-[#ffd716]" /> : <Current size={13} className="text-[#1e1e1e] dark:text-[#ffd716]" />}
        </span>
        <span className={cn("text-[12.5px] font-semibold text-[#1e1e1e] dark:text-white", sidebar && "flex-1 text-left truncate")}>{META[active].label}</span>
        <ChevronDown size={12} className={cn("flex-shrink-0 text-[#9a9a9a] transition-transform duration-200", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: sidebar ? -6 : 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: sidebar ? -6 : 6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "absolute left-0 w-60 rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#ececec] dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] p-2 z-50",
              sidebar ? "bottom-full mb-2" : "mt-2",
            )}
          >
            <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#b3b3b3]">Switch role</p>
            {roles.heldRoles.map((r) => {
              const Icon = META[r].icon;
              const isActive = r === active;
              return (
                <button
                  key={r}
                  onClick={() => { roles.switchRole(r); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                    isActive ? "bg-[#fff7cc] dark:bg-white/[0.08]" : "hover:bg-[#f5f5f5] dark:hover:bg-white/5",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f4f4] dark:bg-white/5">
                    <Icon size={15} className="text-[#1e1e1e] dark:text-white/80" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[#1e1e1e] dark:text-white">{META[r].label}</span>
                    <span className="block text-[11px] text-[#9a9a9a] truncate">{META[r].blurb}</span>
                  </span>
                  {isActive && <Check size={15} className="text-[#1e1e1e] dark:text-[#ffd716] flex-shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
