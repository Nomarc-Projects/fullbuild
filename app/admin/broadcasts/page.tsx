import { AdminBroadcasts } from "@/components/admin/admin-broadcasts";
import { listBroadcasts } from "@/lib/services/broadcasts";
import { isEmailConfigured } from "@/lib/email/mailer";

export const metadata = { title: "Broadcasts" };

export default async function BroadcastsPage() {
  const history = await listBroadcasts();
  return (
    <div className="p-4 sm:p-6">
      <AdminBroadcasts history={history} mailConfigured={isEmailConfigured} />
    </div>
  );
}
