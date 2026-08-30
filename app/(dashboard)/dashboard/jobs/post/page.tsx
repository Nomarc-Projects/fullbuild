import { JobsPostWizard } from "./jobs-post-wizard";
import { EmployerOnboardingWizard } from "@/components/dashboard/onboarding/employer-onboarding-wizard";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function PostJobPage() {
  const viewer = await getViewer();
  // Anyone who has completed the professional profile registration (holds the
  // professional role) lands straight on the post-job form — no employer setup
  // step in the way. The employer onboarding wizard is only shown to signed-in
  // users who haven't registered as professionals yet.
  if (viewer.signedIn && can(viewer, "jobBoard")) {
    return <JobsPostWizard />;
  }
  return <EmployerOnboardingWizard />;
}
