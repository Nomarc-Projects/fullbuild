import { PeoplePageView } from "@/components/dashboard/directory/people-page-view";
import { getPeopleDirectory } from "@/lib/services/directory";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function PeoplePage() {
  const people = await getPeopleDirectory().catch(() => []);

  return (
    <FeatureGate requires="basicProfile">
      <PeoplePageView people={people} />
    </FeatureGate>
  );
}
