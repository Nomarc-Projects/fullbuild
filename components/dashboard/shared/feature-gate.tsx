import { getOnboardingChecklist } from "@/lib/services/onboarding";
import { LockedState } from "@/components/dashboard/kit";

/**
 * "Unlock Access" gating — a feature-completeness gate distinct from the
 * role gates (`professional-gate`/`exhibitor-gate`, which decide whether you
 * HAVE a dashboard at all) and from plan gates (`entitlements.ts`). This one
 * ties individual features to how much of the profile is filled in, matching
 * the redesign's locked states (images 25/29/32/37/46/49/55/63/99):
 *   - `basicProfile`: headline + bio present — Directory, saved items, Messages
 *   - `qualifications`: 3+ skills added — Jobs, Applications
 * Server component: awaits the existing onboarding-checklist service (no new
 * schema) and renders the real screen once its checklist item is done.
 */
type GateKey = "basicProfile" | "qualifications";

const GATE_COPY: Record<GateKey, { checklistKey: string; description: string; ctaLabel: string; href: string }> = {
  basicProfile: {
    checklistKey: "headline",
    description: "To browse, filter, and connect with others, please establish your basic public identity first.",
    ctaLabel: "Complete Profile Details",
    href: "/dashboard/profile",
  },
  qualifications: {
    checklistKey: "skills",
    description: "To highlight your expertise and get matched with the right opportunities, please add your qualifications and skills.",
    ctaLabel: "Add Qualifications & Skills",
    href: "/dashboard/profile?tab=qualifications",
  },
};

/**
 * The checklist is now the ACTIVE role's, so this gate asks each role for
 * something that role can actually provide (an employer is asked for a company
 * name, not an occupation). Two consequences:
 *
 * - A key that does not exist in this role's checklist means the requirement
 *   does not apply, so it GRANTS rather than denies. Denying would lock an
 *   employer out of pages over a professional's skills list, which is the bug
 *   this replaces.
 * - A genuine lookup failure still denies, so a broken read cannot silently
 *   open a gated page.
 */
export async function FeatureGate({ requires, children }: { requires: GateKey; children: React.ReactNode }) {
  let done = false;
  try {
    const checklist = await getOnboardingChecklist();
    const item = checklist.items.find((i) => i.key === GATE_COPY[requires].checklistKey);
    done = item ? item.done : true;
  } catch {
    // Resilient: a checklist hiccup shouldn't 500 the page — default to gated.
  }
  if (done) return <>{children}</>;
  const copy = GATE_COPY[requires];
  return (
    <div className="px-6 py-6 md:px-8">
      <LockedState description={copy.description} cta={{ label: copy.ctaLabel, href: copy.href }} />
    </div>
  );
}
