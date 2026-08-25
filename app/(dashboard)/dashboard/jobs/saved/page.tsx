import { JobsBrowse } from "@/components/dashboard/professional/jobs-browse";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { getJobsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

/**
 * Role first, then completeness. `FeatureGate` is completeness-based and grants
 * when its checklist key is absent from the ACTIVE role's checklist, so on its
 * own it does not keep a non-professional out of a professional page.
 */
export default async function SavedJobsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalOnboarding
        title="Save jobs you're interested in"
        description="Set up your professional profile to browse, save and apply for roles. It takes a couple of minutes — no documents needed today."
      />
    );
  }

  const [items, saved] = await Promise.all([
    getJobsForBrowse().catch(() => []),
    getSavedIds("job").catch(() => []),
  ]);
  return (
    <FeatureGate requires="qualifications">
      <JobsBrowse saved items={items} initialSaved={saved} />
    </FeatureGate>
  );
}
