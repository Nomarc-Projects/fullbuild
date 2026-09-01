import { redirect } from "next/navigation";
import { ApplyForm } from "@/components/dashboard/professional/apply-form";
import { getJobById } from "@/lib/services/catalog";
import { getJobPostingDetail } from "@/lib/services/jobs";

export default async function JobApplyPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  if (!job) redirect("/dashboard/jobs");
  const j = await getJobById(job);
  if (!j) redirect("/dashboard/jobs");

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
