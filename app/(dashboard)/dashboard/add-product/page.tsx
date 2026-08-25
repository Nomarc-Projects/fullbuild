import { AddProductForm } from "./add-product-form";
import { ExhibitorGate } from "@/components/dashboard/onboarding/exhibitor-gate";
import { VerificationRequired } from "@/components/dashboard/exhibitor/verification-required";
import { getViewer } from "@/lib/viewer-server";
import { can } from "@/lib/entitlements";
import { getMyCompany } from "@/lib/services/company";
import { getTrialState } from "@/lib/services/exhibitor-trial";
import { TrialExhausted } from "@/components/dashboard/exhibitor/trial-exhausted";

export const metadata = { title: "Add new product" };

export default async function AddProductPage() {
  const viewer = await getViewer();
  if (!can(viewer, "exhibitorDashboard")) {
    return (
      <ExhibitorGate
        title="Become an Exhibitor to add products"
        description="Add your company name and primary industry to open your showroom — takes less than a minute."
      />
    );
  }
  // Trusted-marketplace gate: exhibitors must be verified before uploading (image 73).
  const { data: company } = await getMyCompany();
  if (!company.verified) return <VerificationRequired />;

  // The dashboard raises a modal before sending anyone here, but the URL is
  // typeable — so the allowance is checked again on the way in. Drafting is
  // still permitted when the allowance is spent; only publishing is blocked,
  // which createProduct enforces independently.
  const trial = await getTrialState().catch(() => null);
  if (trial && !trial.canPublish) {
    return <TrialExhausted expired={trial.reason === "trial_expired"} daysLeft={trial.daysLeft} />;
  }

  return <AddProductForm />;
}
