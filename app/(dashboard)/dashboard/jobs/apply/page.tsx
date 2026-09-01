import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/dashboard/professional/apply-form";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { getJobById } from "@/lib/services/catalog";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
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
