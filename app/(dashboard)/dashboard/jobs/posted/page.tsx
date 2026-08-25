import { PostedJobs } from "@/components/dashboard/posted-jobs";
import { EmployerOnboardingWizard } from "@/components/dashboard/onboarding/employer-onboarding-wizard";
import { getMyPostedJobs } from "@/lib/services/jobs";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function PostedJobsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "hireTalent")) {
    return <EmployerOnboardingWizard />;
  }
  const jobs = await getMyPostedJobs();
  return <PostedJobs jobs={jobs} />;
}
