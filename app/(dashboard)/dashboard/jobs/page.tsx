import { JobsBrowse } from "@/components/dashboard/professional/jobs-browse";
import { getJobsForBrowse } from "@/lib/services/catalog";
import { getSavedIds } from "@/lib/services/saved";

export default async function JobsPage() {
  const [items, saved] = await Promise.all([
    getJobsForBrowse().catch(() => []),
    getSavedIds("job").catch(() => []),
  ]);
  return <JobsBrowse items={items} initialSaved={saved} />;
}
