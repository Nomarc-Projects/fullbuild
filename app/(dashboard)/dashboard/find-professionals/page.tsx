import { headers } from "next/headers";
import { FindProfessionals } from "@/components/dashboard/find-professionals";
import { getProfessionals } from "@/lib/services/directory";
import { getMyOpenJobs } from "@/lib/services/jobs";
import { presenceFor } from "@/lib/services/network";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/use-dashboard-role";
import { FeatureGate } from "@/components/dashboard/shared/feature-gate";

export default async function FindProfessionalsPage() {
  const [session, pros, myJobs] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getProfessionals().catch(() => []),
    getMyOpenJobs().catch(() => []),
  ]);
  const raw = (session?.user as { role?: string } | undefined)?.role;
  const role: Role = raw === "exhibitor" ? "exhibitor" : "professional";
  const online = await presenceFor(pros.map((p) => p.id));
  return (
    <FeatureGate requires="basicProfile">
      <FindProfessionals role={role} pros={pros} myOpenJobs={myJobs} online={online} />
    </FeatureGate>
  );
}
