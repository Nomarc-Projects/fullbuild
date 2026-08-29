import { Applications } from "@/components/dashboard/professional/applications";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { getMyApplications } from "@/lib/services/applications";
import { getSavedLocation } from "@/lib/services/profile";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function ApplicationsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    const savedLocation = await getSavedLocation();
    return (
      <ProfessionalOnboarding
        title="Track your applications"
        description="Set up your professional profile to apply for roles and follow their progress. It takes a couple of minutes — no documents needed today."
        savedLocation={savedLocation}
      />
    );
  }

  const rows = await getMyApplications(false);
  return (
    <FeatureGate requires="qualifications">
      <Applications rows={rows} />
    </FeatureGate>
  );
}
