import { redirect } from "next/navigation";
import { CheckoutView, type CheckoutPlan } from "@/components/dashboard/checkout-view";
import { configuredProviders } from "@/lib/payments";
import type { BillingCycle } from "@/lib/entitlements";

/** Professional Premium is excluded — it is still coming soon (see startCheckout). */
const BUYABLE = ["plus", "pro", "sme", "exhibitor", "key_player"] as const;

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; billing?: string }> }) {
  const { plan, billing } = await searchParams;
  if (!(BUYABLE as readonly string[]).includes(plan ?? "")) redirect("/dashboard/plans");
  const cycle: BillingCycle = ["monthly", "biannual", "annual"].includes(billing ?? "") ? (billing as BillingCycle) : "monthly";
  return <CheckoutView plan={plan as CheckoutPlan} initialCycle={cycle} available={configuredProviders()} />;
}
