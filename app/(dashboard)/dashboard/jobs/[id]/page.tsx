import { notFound } from "next/navigation";
import { getJobById, getJobsForBrowse } from "@/lib/services/catalog";
import { getJobPostingDetail } from "@/lib/services/jobs";
import { JOB_OVERVIEW, type SampleJob } from "@/lib/sample-jobs";
import { JobDetail } from "@/components/dashboard/professional/job-detail";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

/**
 * Real jobs only.
 *
 * This fell back to demo listings for the job itself and padded "similar jobs"
 * with them whenever fewer than four real jobs existed. Those samples have ids
 * like "s1", so their Apply buttons linked to a job that cannot exist and the
 * apply page failed on it. A missing job is now a 404, and a thin board simply
 * shows fewer suggestions.
 */
export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Same doorway rule as the board itself — a listing is a professional-track
  // page, so a viewer without the role is offered onboarding rather than the job.
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalOnboarding
        title="View this role on Nomarc"
        description="Set up your professional profile to see full role details and apply. It takes a couple of minutes — no documents needed today."
      />
    );
  }

  const job: SampleJob | null = await getJobById(id).catch(() => null);
  if (!job) notFound();

  const [pool, detail] = await Promise.all([
    getJobsForBrowse().catch((): SampleJob[] => []),
    getJobPostingDetail(id).catch(() => ({ requirements: [], skills: [], benefits: [], requireResume: false, requirePortfolio: false, requireCoverLetter: false })),
  ]);

  const similar = pool.filter((j) => j.id !== job!.id).slice(0, 4);
  const otherFromCompany = pool.filter((j) => j.id !== job!.id && j.company === job!.company).slice(0, 3);

  return <JobDetail job={job} overview={JOB_OVERVIEW} detail={detail} similar={similar} otherFromCompany={otherFromCompany} />;
}
