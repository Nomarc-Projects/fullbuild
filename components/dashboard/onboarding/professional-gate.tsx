"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/modal";
import { saveProfile } from "@/lib/services/profile";
import { AptitudeQuiz } from "@/components/dashboard/onboarding/aptitude-quiz";

/**
 * Shown in place of a professional-track page when the viewer holds no role
 * yet. Two steps: a quick profile form (saves headline/bio, no grant), then
 * the general aptitude quiz — passing it is what actually grants the
 * professional role (lib/services/quiz.ts::submitQuizAttempt). On pass,
 * refresh so the parent server page re-evaluates the gate and reveals the
 * real content.
 */
export function ProfessionalGate({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "quiz">("form");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!headline.trim()) { toast.error("Please add a job title."); return; }
    start(async () => {
      try {
        await saveProfile({ headline, bio });
        setStep("quiz");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  if (step === "quiz") {
    return (
      <AptitudeQuiz
        onPass={() => { toast.success("You're set up — welcome to the professional track!"); router.refresh(); }}
        onClose={() => setStep("form")}
      />
    );
  }

  return (
    <div className="px-5 sm:px-8 py-10 max-w-[560px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-[#ffd716]/30 blur-xl scale-110" />
            <div className="relative w-16 h-16 rounded-2xl bg-[#fff7cc] dark:bg-[#ffd716]/10 border border-[#ffd716]/40 flex items-center justify-center">
              <Briefcase size={28} className="text-[#caa400]" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e1e1e] dark:text-white">{title}</h1>
          <p className="mt-2 text-[13px] text-[#6b6b6b] dark:text-white/60 leading-relaxed max-w-[420px]">{description}</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-[#ececec] dark:border-white/10 bg-white dark:bg-[#1e1e1e] p-5 sm:p-6 space-y-4">
          <Field label="Job title / headline">
            <input
              required
              maxLength={80}
              className={inputClass}
              placeholder="e.g. Structural Engineer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </Field>
          <Field label="Short bio" hint="Optional">
            <textarea
              rows={3}
              maxLength={280}
              className={inputClass}
              placeholder="A couple of lines about your experience…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>
          <button
            type="submit"
            disabled={pending}
            className="group w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffd716] text-[#1e1e1e] font-semibold py-3 text-sm hover:bg-[#e6c114] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? (
              <><Loader2 size={16} className="animate-spin" /> Setting up…</>
            ) : (
              <>Unlock & continue <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
