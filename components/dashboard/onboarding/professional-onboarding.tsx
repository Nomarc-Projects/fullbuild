"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Loader2, Check, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/modal";
import { Logo } from "@/components/ui/logo";
import { saveProfile } from "@/lib/services/profile";
import { AptitudeQuiz } from "@/components/dashboard/onboarding/aptitude-quiz";
import { useMultiStep } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import {
  WizardFooter,
  SegmentBar,
  StepHeader,
  CancelSetupDialog,
  yellowBtn,
  ghostBtn,
} from "./wizard-chrome";
import { useTour } from "@/components/tour/tour-provider";

/** Tier 1 checklist — mirrors professionalChecklist() in lib/services/profile-checklist.ts. */
const TIER1_ITEMS = [
  { label: "Add a profile photo", href: "/dashboard/profile" },
  { label: "Add your occupation & bio", href: "/dashboard/profile" },
  { label: "Add your location", href: "/dashboard/profile" },
  { label: "Add work experience", href: "/dashboard/profile?tab=qualifications" },
  { label: "Add at least 3 skills", href: "/dashboard/profile?tab=qualifications" },
  { label: "Add your education", href: "/dashboard/profile?tab=education" },
];

/**
 * 4-step professional onboarding: identity → aptitude quiz (grants the role) →
 * a quick, OPTIONAL look at what unlocks applying later → done.
 *
 * Deliberately low-friction, matching the exhibitor/employer wizards: nothing
 * here demands documents someone may not have on hand. Verification tiers are
 * explained but skippable — Tier 1/2 items live on the dashboard checklist
 * where the user can chip away whenever they're ready.
 */
export function ProfessionalOnboarding({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  const { startWelcome, hasWelcome } = useTour();

  const { step, next, prev, goTo } = useMultiStep(4);

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  function saveIdentity() {
    if (!headline.trim()) { toast.error("Enter your job title."); return; }
    setPending(true);
    startIdentity();
  }

  async function startIdentity() {
    try {
      await saveProfile({ headline, bio, location });
      next();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function onQuizPass() {
    toast.success("You're set up — welcome to the professional track!");
    next();
  }

  function goDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  function takeTour() {
    if (hasWelcome()) startWelcome();
    goDashboard();
  }

  function requestClose() {
    if (step === 3) { goDashboard(); return; }
    setCancelOpen(true);
  }

  return (
    <div className="min-h-full bg-[#f4f4f4] px-3 py-4 dark:bg-[#161616] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
        <div className="px-6 pt-6 sm:px-10 sm:pt-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* ── Step 0 — Identity ──────────────────────────────── */}
              {step === 0 && (
                <div>
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-5 dark:border-white/10">
                    <Logo size="sm" tone="auto" />
                    <button onClick={requestClose} aria-label="Close" className="text-[#9a9a9a] transition-colors hover:text-[#1e1e1e] dark:hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="border-b border-[#f0f0f0] py-7 text-center dark:border-white/10">
                    <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1e1e1e] dark:text-white">Nomarc Projects<br />Professional Onboarding</h1>
                    <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/55">{description}</p>
                  </div>
                  <div className="py-6">
                    <div className="space-y-4">
                      <Field label="Job title / headline">
                        <input className={inputClass} maxLength={80} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Structural Engineer" />
                      </Field>
                      <Field label="Location" hint="Optional">
                        <input className={inputClass} maxLength={60} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lagos, Nigeria" />
                      </Field>
                      <Field label="Short bio" hint="Optional">
                        <textarea rows={4} maxLength={280} className={inputClass} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A couple of lines about your experience…" />
                      </Field>
                      <button onClick={saveIdentity} disabled={pending} className={cn(yellowBtn, "w-full py-3")}>
                        {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />} Continue to the quiz
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1 — Aptitude quiz (grants the role) ──────── */}
              {step === 1 && (
                <div className="pb-2">
                  <SegmentBar current={1} total={3} />
                  <StepHeader title="Professional Onboarding" subtitle="A short aptitude quiz to set up your professional profile." onClose={requestClose} />
                  <AptitudeQuiz onPass={onQuizPass} onClose={() => goTo(0)} />
                </div>
              )}

              {/* ── Step 2 — Verification tiers (OPTIONAL) ─────────── */}
              {step === 2 && (
                <div className="pb-2">
                  <SegmentBar current={2} total={3} />
                  <StepHeader
                    title="You're a Professional"
                    subtitle="You're in — nothing here is required today. This is just so you know what unlocks more as you go."
                    onClose={requestClose}
                  />

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7f6ec] text-[#1a7f43] dark:bg-[#1a7f43]/15 dark:text-[#4ade80]"><ShieldCheck size={18} /></div>
                        <div>
                          <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Tier 1 — Complete your profile</h3>
                          <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/55">Finishing these clears Tier 1, which most applications expect. They're on your dashboard checklist too — do them whenever.</p>
                        </div>
                      </div>
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {TIER1_ITEMS.map((item) => (
                          <li key={item.label}>
                            <Link href={item.href} className="flex items-center gap-2 rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-[13px] text-[#1e1e1e] transition-colors hover:border-[#ffd716] dark:border-white/10 dark:bg-transparent dark:text-white">
                              <Check size={14} className="flex-shrink-0 text-[#9a9a9a]" />
                              {item.label}
                              <ArrowRight size={12} className="ml-auto flex-shrink-0 text-[#b3b3b3]" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff7cc] text-[#8a6d00] dark:bg-[#ffd716]/15 dark:text-[#ffd716]"><ShieldCheck size={18} /></div>
                        <div>
                          <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Tier 2 — Get the verified seal</h3>
                          <p className="text-[12.5px] text-[#6b6b6b] dark:text-white/55">Optional, and entirely up to you: upload identity documents anytime to earn the verified seal. No rush.</p>
                        </div>
                      </div>
                      <Link href="/dashboard/kyc" className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#caa400] hover:underline">
                        See verification requirements <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2.5">
                    <button onClick={prev} className={cn(ghostBtn, "flex-1")}>Back</button>
                    <button onClick={takeTour} className={cn(yellowBtn, "flex-1")}>
                      <Sparkles size={15} /> Take the welcome tour
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3 — Done ───────────────────────────────────── */}
              {step === 3 && (
                <div className="pb-2">
                  <SegmentBar current={3} total={3} />
                  <StepHeader title="Professional Onboarding" subtitle="You're all set!" onClose={requestClose} />

                  <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] p-5 dark:border-white/10 dark:bg-white/[0.02]">
                    <h3 className="text-[15px] font-bold text-[#1e1e1e] dark:text-white">Thank you for joining the professional track!</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">Your professional profile is set up. Head to your dashboard to browse jobs, complete your profile checklist, and use the professional tools now open to you.</p>
                    <p className="mt-4 text-[13px] font-semibold text-[#1e1e1e] dark:text-white">What&apos;s Next:</p>
                    <ul className="mt-2 space-y-2.5 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-white/60">
                      <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span><span className="font-semibold text-[#1e1e1e] dark:text-white">Apply for jobs:</span> Browse the job board and apply — completing your Tier 1 profile basics clears the way.</span></li>
                      <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#9a9a9a]" /><span><span className="font-semibold text-[#1e1e1e] dark:text-white">Meet Helm:</span> Your AI construction consultant — contract review, BOQs and code lookups, grounded in real sources.</span></li>
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                    <button onClick={() => { router.push("/dashboard/jobs"); router.refresh(); }} className={cn(ghostBtn, "w-full sm:flex-1")}>
                      Browse Jobs
                    </button>
                    <button onClick={goDashboard} className={cn(yellowBtn, "w-full sm:flex-1")}>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> Go to My Dashboard
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <WizardFooter />
      </div>

      <CancelSetupDialog
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onConfirm={() => { setCancelOpen(false); goDashboard(); }}
      />
    </div>
  );
}
