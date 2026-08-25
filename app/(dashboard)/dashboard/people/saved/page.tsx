import { SavedProfessionals } from "@/components/dashboard/my-network";
import { getProfessionals } from "@/lib/services/directory";
import { getSavedIds } from "@/lib/services/saved";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

/** "Saved Profile" nav destination — just the saved professionals, no tabs. */
export default async function SavedProfilesPage() {
  const [pros, savedIds] = await Promise.all([
    getProfessionals().catch(() => []),
    getSavedIds("professional").catch(() => []),
  ]);

  const savedSet = new Set(savedIds);
  const saved = pros.filter((p) => savedSet.has(p.id));

  return (
    <FeatureGate requires="basicProfile">
      <SavedProfessionals people={saved} />
    </FeatureGate>
  );
}
