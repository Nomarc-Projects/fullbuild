import { redirect } from "next/navigation";
import { getMyTransactions } from "@/lib/services/billing";
import { ReceiptView } from "@/components/dashboard/receipt-view";

export default async function ReceiptPage() {
  const txs = await getMyTransactions();
  const latest = txs[0];
  if (!latest) redirect("/dashboard/plans");
  return <ReceiptView tx={latest} />;
}
