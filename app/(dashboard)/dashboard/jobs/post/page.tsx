import { JobsPostWizard } from "./jobs-post-wizard";
import { EmployerOnboardingWizard } from "@/components/dashboard/onboarding/employer-onboarding-wizard";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function PostJobPage() {
  const viewer = await getViewer();
  if (!can(viewer, "hireTalent")) {
    return <EmployerOnboardingWizard />;
  }
  return <JobsPostWizard />;
}
