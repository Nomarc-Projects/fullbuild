import { JobsBrowse } from "@/components/dashboard/professional/jobs-browse";
import { ProfessionalGate } from "@/components/dashboard/onboarding/professional-gate";
import { getJobsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

export default async function SavedJobsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalGate
        title="Complete your profile to find jobs"
        description="A quick headline and bio unlocks the job board — takes less than a minute."
      />
    );
  }
  const [items, saved] = await Promise.all([
    getJobsForBrowse().catch(() => []),
    getSavedIds("job").catch(() => []),
  ]);
  return <JobsBrowse saved items={items} initialSaved={saved} />;
}
