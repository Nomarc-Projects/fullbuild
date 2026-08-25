"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { requireUserId } from "@/lib/server-user";
import {
  professionalChecklist,
  checklistPercent,
  outstandingItems,
  type ChecklistItem,
} from "@/lib/services/profile-checklist";

/** intern | graduate | consultant | licensed | company */
export type PracticeStatus = "" | "intern" | "graduate" | "consultant" | "licensed" | "company";

export type ProfileData = {
  name: string;
  headline: string;
  location: string;
  availability: string;
  bio: string;
  avatarUrl: string;
  practiceStatus: PracticeStatus;
  licenseNumber: string;
  practiceCompanyName: string;
  practiceRegNumber: string;
  practiceCompanyAddress: string;
  practiceCompanyBio: string;
  completeness: number;
  verified: boolean;
};

/* computeCompleteness() lived here and scored nine checks, while
 * getOnboardingChecklist() scored six; the two rendered side by side on the
 * dashboard showing 56% and 50% at the same moment. Both now defer to
 * ./profile-checklist, which is the only definition. */

/**
 * `missing` carries whole checklist items, not labels.
 *
 * It used to be `string[]`, which is why the profile page could only print
 * "Add: Profile photo, Bio, Work experience, At least 3 skills…" and truncate.
 * With the href and tab attached, every outstanding item becomes something the
 * member can click straight through to.
 */
export async function getMyProfile(): Promise<{ data: ProfileData; missing: ChecklistItem[] }> {
  const uid = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const [p] = await db.select().from(profile).where(eq(profile.userId, uid)).limit(1);
  const items = await professionalChecklist(uid);
  const c = { percent: checklistPercent(items), missing: outstandingItems(items) };
  return {
    data: {
      name: session?.user?.name ?? "",
      headline: p?.headline ?? "",
      location: p?.location ?? "",
      availability: p?.availability ?? "",
      bio: p?.bio ?? "",
      avatarUrl: p?.avatarUrl ?? "",
      practiceStatus: (p?.practiceStatus ?? "") as PracticeStatus,
      licenseNumber: p?.licenseNumber ?? "",
      practiceCompanyName: p?.practiceCompanyName ?? "",
      practiceRegNumber: p?.practiceRegNumber ?? "",
      practiceCompanyAddress: p?.practiceCompanyAddress ?? "",
      practiceCompanyBio: p?.practiceCompanyBio ?? "",
      completeness: c.percent,
      verified: p?.verified ?? false,
    },
    missing: c.missing,
  };
}

/**
 * Persist the phone + location collected on the signup form.
 *
 * Separate from `saveProfile` because that one never touches `phone`: changing
 * a phone elsewhere has to drop the verified badge (see `phone-verify.ts`),
 * whereas here the profile is brand new and nothing is verified yet. Writes
 * `phoneVerified: false` explicitly so a signup can never mint a trusted
 * number.
 */
export async function saveSignupDetails(input: { phone?: string; location?: string }) {
  const uid = await requireUserId();
  const phone = input.phone?.trim() || null;
  const location = input.location?.trim() || null;
  if (!phone && !location) return;

  const [existing] = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, uid)).limit(1);
  if (existing) {
    await db.update(profile).set({ phone, location, phoneVerified: false, updatedAt: new Date() }).where(eq(profile.userId, uid));
  } else {
    await db.insert(profile).values({ userId: uid, phone, location, phoneVerified: false });
  }
}

export async function saveProfile(input: {
  name?: string; headline?: string; location?: string; availability?: string; bio?: string; avatarUrl?: string;
  practiceStatus?: PracticeStatus;
  licenseNumber?: string; practiceCompanyName?: string; practiceRegNumber?: string;
  practiceCompanyAddress?: string; practiceCompanyBio?: string;
}) {
  const uid = await requireUserId();
  // Fields belonging to a status the user is no longer on are cleared rather
  // than left behind — otherwise switching Licensed → Company keeps a stale
  // licence number that the form no longer shows and nobody can remove.
  const status = input.practiceStatus;
  const licensed = status === undefined || status === "licensed";
  const isCompany = status === undefined || status === "company";
  const fields = {
    headline: input.headline, location: input.location, availability: input.availability,
    bio: input.bio, avatarUrl: input.avatarUrl,
    ...(status !== undefined ? { practiceStatus: status || null } : {}),
    ...(input.licenseNumber !== undefined || status !== undefined ? { licenseNumber: licensed ? (input.licenseNumber ?? null) : null } : {}),
    ...(input.practiceCompanyName !== undefined || status !== undefined ? { practiceCompanyName: isCompany ? (input.practiceCompanyName ?? null) : null } : {}),
    ...(input.practiceRegNumber !== undefined || status !== undefined ? { practiceRegNumber: isCompany ? (input.practiceRegNumber ?? null) : null } : {}),
    ...(input.practiceCompanyAddress !== undefined || status !== undefined ? { practiceCompanyAddress: isCompany ? (input.practiceCompanyAddress ?? null) : null } : {}),
    ...(input.practiceCompanyBio !== undefined || status !== undefined ? { practiceCompanyBio: isCompany ? (input.practiceCompanyBio ?? null) : null } : {}),
  };
  const [existing] = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, uid)).limit(1);
  if (existing) await db.update(profile).set({ ...fields, updatedAt: new Date() }).where(eq(profile.userId, uid));
  else await db.insert(profile).values({ userId: uid, ...fields });
  // Mirror name + avatar onto the Better Auth user so the session (and every
  // navbar/sidebar that reads it) stays consistent with the uploaded avatar.
  const userPatch: { name?: string; image?: string } = {};
  if (input.name) userPatch.name = input.name;
  if (input.avatarUrl !== undefined) userPatch.image = input.avatarUrl || "";
  if (Object.keys(userPatch).length) {
    try { await auth.api.updateUser({ body: userPatch, headers: await headers() }); } catch { /* best-effort */ }
  }
  // Note: completing this form no longer grants the professional role by
  // itself — passing the aptitude quiz does (lib/services/quiz.ts).
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
}
