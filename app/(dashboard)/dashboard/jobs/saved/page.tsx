import { JobsBrowse } from "@/components/dashboard/professional/jobs-browse";
import { getJobsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";

export default async function SavedJobsPage() {
  const [items, saved] = await Promise.all([
    getJobsForBrowse().catch(() => []),
    getSavedIds("job").catch(() => []),
  ]);
  return <JobsBrowse saved items={items} initialSaved={saved} />;
}
