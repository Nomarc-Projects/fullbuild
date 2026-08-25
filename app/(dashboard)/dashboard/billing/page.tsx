import { getViewer } from "@/lib/viewer-server";
import { getMyTransactions } from "@/lib/services/billing";
import { PLAN_LABEL } from "@/lib/entitlements";
import { BillingView } from "@/components/dashboard/billing-view";

export default async function BillingPage() {
  const [viewer, txs] = await Promise.all([getViewer(), getMyTransactions()]);
  return <BillingView planLabel={PLAN_LABEL[viewer.plan]} isFree={viewer.plan === "free"} txs={txs} />;
}
