import { PlansView } from "@/components/dashboard/plans-view";
import { activeProvider } from "@/lib/payments";

export default function PlansPage() {
  // Demo mode is the opt-in no-gateway path (ALLOW_DEMO_PAYMENTS) where
  // subscribing grants the tier without a charge. The page has to say so —
  // telling an exhibitor a ₦500,000 tier "isn't charged yet" would be badly
  // wrong once a provider is live.
  const demoMode = activeProvider() === null && process.env.ALLOW_DEMO_PAYMENTS === "true";
  return <PlansView demoMode={demoMode} unavailable={activeProvider() === null && !demoMode} />;
}
