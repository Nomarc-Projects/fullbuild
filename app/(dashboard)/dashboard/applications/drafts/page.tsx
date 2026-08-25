import { ApplicationDrafts } from "@/components/dashboard/professional/application-drafts";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { getMyApplications } from "@/lib/services/applications";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function ApplicationDraftsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalOnboarding
        title="Draft your applications"
        description="Set up your professional profile to start applying for roles. It takes a couple of minutes — no documents needed today."
      />
    );
  }

  const rows = await getMyApplications(true);
  return (
    <FeatureGate requires="qualifications">
      <ApplicationDrafts rows={rows} />
    </FeatureGate>
  );
}
