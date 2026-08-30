import { PostedJobs } from "@/components/dashboard/posted-jobs";
import { EmployerOnboardingWizard } from "@/components/dashboard/onboarding/employer-onboarding-wizard";
import { getMyPostedJobs } from "@/lib/services/jobs";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function PostedJobsPage() {
  const viewer = await getViewer();
  // Professionals who've completed registration see their posted jobs directly
  // (no employer setup screen in the way). The onboarding wizard is only shown
  // to signed-in users who haven't registered professionally yet.
  if (viewer.signedIn && can(viewer, "jobBoard")) {
    const jobs = await getMyPostedJobs();
    return <PostedJobs jobs={jobs} />;
  }
  return <EmployerOnboardingWizard />;
}
