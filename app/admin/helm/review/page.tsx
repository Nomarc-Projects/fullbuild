import { listHelmReviewQueue } from "@/lib/services/helm-admin";
import { HelmReviewView } from "@/components/admin/helm/helm-review";

export const metadata = { title: "Helm answer review — Admin" };

export default async function AdminHelmReviewPage() {
  const items = await listHelmReviewQueue();
  return <HelmReviewView items={items} />;
}
