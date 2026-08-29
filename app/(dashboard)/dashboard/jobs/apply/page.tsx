import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/dashboard/professional/apply-form";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { LockedState } from "@/components/dashboard/kit";
import { getJobById } from "@/lib/services/catalog";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { requireUserId } from "@/lib/server-user";
import { outstandingTier1 } from "@/lib/services/profile-checklist";
import { getSavedLocation } from "@/lib/services/profile";
import { getJobPostingDetail } from "@/lib/services/jobs";

export default async function JobApplyPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  if (!job) redirect("/dashboard/jobs");
  const j = await getJobById(job);
  if (!j) redirect("/dashboard/jobs");

  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    const savedLocation = await getSavedLocation();
    return (
      <ProfessionalOnboarding
        title="Become a Professional"
        description="Set up your professional profile to apply for this role. It takes a couple of minutes — no documents needed today."
        savedLocation={savedLocation}
      />
    );
  }

  // Tier 1 is the bar for APPLYING, not for joining. Onboarding stays cheap on
  // purpose, so this is where a profile has to actually be complete enough for
  // an employer to assess — which is what the wizard told the user would happen.
  const uid = await requireUserId();
  const outstanding = await outstandingTier1(uid).catch(() => []);
  if (outstanding.length > 0) {
    return (
      <div className="px-6 py-6 md:px-8">
        <LockedState
          title="Complete your profile to apply"
          description={`Employers assess applicants on their profile, so a few basics are required before you can apply: ${outstanding
            .map((i) => i.label.replace(/^Add (your )?/i, ""))
            .join(", ")}.`}
          cta={{ label: outstanding[0].label, href: outstanding[0].href }}
        />
      </div>
    );
  }

  // What the poster asked applicants for. All false on jobs posted before the
  // choice existed, which enforces nothing.
  const detail = await getJobPostingDetail(j.id).catch(() => null);

  return (
    <ApplyForm
      jobId={j.id}
      jobTitle={j.title}
      jobCompany={j.company}
      jobLocation={j.location}
      required={{
        resume: detail?.requireResume ?? false,
        portfolio: detail?.requirePortfolio ?? false,
        coverLetter: detail?.requireCoverLetter ?? false,
      }}
    />
  );
}
