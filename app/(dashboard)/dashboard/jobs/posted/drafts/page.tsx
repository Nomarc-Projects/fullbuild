import { PostedJobs } from "@/components/dashboard/posted-jobs";
import { EmployerOnboardingWizard } from "@/components/dashboard/onboarding/employer-onboarding-wizard";
import { getMyPostedJobs } from "@/lib/services/jobs";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

/** "Draft" nav destination — Posted Jobs with the Drafts tab preselected. */
export default async function JobDraftsPage() {
  const viewer = await getViewer();
  // Same entrance rule as /dashboard/jobs/posted: professionals who've completed
  // registration land straight on the content, no employer setup screen.
  if (viewer.signedIn && can(viewer, "jobBoard")) {
    const jobs = await getMyPostedJobs();
    return <PostedJobs jobs={jobs} initialTab="drafts" />;
  }
  return <EmployerOnboardingWizard />;
}
