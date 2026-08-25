import { JobsBrowse } from "@/components/dashboard/professional/jobs-browse";
import { ProfessionalOnboarding } from "@/components/dashboard/onboarding/professional-onboarding";
import { getJobsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";

/**
 * "Find work" is the professional track's front door, and the sidebar offers it
 * under Explore to anyone who does NOT hold the role yet — the same shape as
 * "Post a job" (employer) and "Sell materials" (exhibitor).
 *
 * So a viewer without the professional role gets the onboarding wizard here,
 * not the board. This page previously rendered the board unconditionally, which
 * let an employer-only account browse listings and press Apply on a track they
 * had never joined. Onboarding stays cheap — identity, a short quiz, and
 * verification tiers explained but skippable; the real bar is Tier 1
 * completeness, enforced where it belongs, on /dashboard/jobs/apply.
 */
export default async function JobsPage() {
  const viewer = await getViewer();
  if (!can(viewer, "jobBoard")) {
    return (
      <ProfessionalOnboarding
        title="Find work on Nomarc"
        description="Set up your professional profile to browse and apply for roles. It takes a couple of minutes — no documents needed today."
      />
    );
  }

  const [items, saved] = await Promise.all([
    getJobsForBrowse().catch(() => []),
    getSavedIds("job").catch(() => []),
  ]);
  return <JobsBrowse items={items} initialSaved={saved} />;
}
