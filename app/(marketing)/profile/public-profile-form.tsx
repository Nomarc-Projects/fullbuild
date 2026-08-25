"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { saveProfile, type ProfileData } from "@/lib/services/profile";
import { uploadFile } from "@/lib/upload-client";
import { NG_STATES, lgasFor } from "@/lib/data/nigeria-lga";
import { OCCUPATIONS, KNOWN_OCCUPATIONS } from "@/lib/data/occupations";

/** Stand-in until the member uploads a picture. Exported so the profile header
 *  falls back to the same mark rather than a stock photo of someone else. */
export const DEFAULT_AVATAR = "/logos/mark-on-light.png";

/** The two states the redesign offers. `hiring` is still a valid stored value —
 *  employers set it from the settings hub — so an existing value that isn't one
 *  of these is preserved rather than silently rewritten on save. */
const AVAIL_OPTIONS = ["Open to work (show profile badge)", "None"];
const AVAIL_TO_DB: Record<string, string> = { "Open to work (show profile badge)": "open_to_work", None: "none" };
const AVAIL_FROM_DB: Record<string, string> = { open_to_work: "Open to work (show profile badge)", none: "None" };

/** Location is stored as one string ("address, LGA, State"). Split it back into
 *  its parts by matching the tail against the states/LGA dataset; anything that
 *  doesn't match (older free-text values) falls back to the address field. */
function parseLocation(loc: string): { address: string; state: string; lga: string } {
  const parts = (loc ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { address: "", state: "", lga: "" };
  const tail = parts[parts.length - 1].replace(/\s+state$/i, "").trim();
  const state = NG_STATES.find((s) => s.toLowerCase() === tail.toLowerCase());
  if (!state) return { address: parts.join(", "), state: "", lga: "" };
  let rest = parts.slice(0, -1);
  let lga = "";
  if (rest.length) {
    const match = lgasFor(state).find((l) => l.toLowerCase() === rest[rest.length - 1].toLowerCase());
    if (match) { lga = match; rest = rest.slice(0, -1); }
  }
  return { address: rest.join(", "), state, lga };
}

export function PublicProfileForm({ initial }: { initial?: ProfileData }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  // Occupation is stored as the headline. The select tracks which fixed option
  // (or "Others") is picked; a saved value that isn't one of the fixed options
  // means a custom occupation — rehydrate the select to "Others" with their
  // text back in the input.
  const [occupationPick, setOccupationPick] = useState(
    initial?.headline ? (KNOWN_OCCUPATIONS.includes(initial.headline) ? initial.headline : "Others") : "",
  );
  const [customOccupation, setCustomOccupation] = useState(
    initial?.headline && !KNOWN_OCCUPATIONS.includes(initial.headline) ? initial.headline : "",
  );
  function pickOccupation(v: string) {
    setOccupationPick(v);
    // Leaving "Others" discards the custom text; entering it keeps whatever
    // was typed so an accidental switch doesn't lose input.
    if (v === "Others") setHeadline(customOccupation);
    else { setCustomOccupation(""); setHeadline(v); }
  }
  const parsed = parseLocation(initial?.location ?? "");
  const [address, setAddress] = useState(parsed.address);
  const [stateName, setStateName] = useState(parsed.state);
  const [lga, setLga] = useState(parsed.lga);
  const [availability, setAvailability] = useState(AVAIL_FROM_DB[initial?.availability ?? ""] ?? "");
  // Practice status and its dependent fields (license number, company details)
  // are no longer offered in this form; pass any stored values straight back so
  // saving never wipes them.
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [avatar, setAvatar] = useState(initial?.avatarUrl || DEFAULT_AVATAR);
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)."); return; }
    const local = URL.createObjectURL(file);
    setAvatar(local); setUploading(true);
    try {
      const url = await uploadFile(file, "avatar");
      setAvatar(url); setAvatarUrl(url);
      await saveProfile({ avatarUrl: url });
      toast.success("Picture updated");
      router.refresh();
    } catch (e) {
      setAvatar(avatarUrl || DEFAULT_AVATAR);
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(false); URL.revokeObjectURL(local); }
  }

  function removeAvatar() {
    setAvatar(DEFAULT_AVATAR); setAvatarUrl("");
    saveProfile({ avatarUrl: "" }).then(() => { toast("Picture removed"); router.refresh(); }).catch(() => toast.error("Failed"));
  }

  function save() {
    const location = [address.trim(), lga, stateName].filter(Boolean).join(", ");
    // "Others" requires the custom occupation to be filled in — an empty
    // headline would blank the profile.
    const headlineToSave = occupationPick === "Others" ? customOccupation.trim() : headline;
    if (occupationPick === "Others" && !headlineToSave) {
      toast.error("Please enter your occupation.");
      return;
    }
    // An availability the redesign no longer offers (e.g. an employer's
    // "hiring") is left as-is rather than overwritten by an empty selection.
    const avail = availability ? AVAIL_TO_DB[availability] : (initial?.availability ?? "");
    start(async () => {
      try {
        await saveProfile({
          name, headline: headlineToSave, location, availability: avail, bio, avatarUrl,
          practiceStatus: initial?.practiceStatus ?? "",
          licenseNumber: initial?.licenseNumber ?? "",
          practiceCompanyName: initial?.practiceCompanyName ?? "",
          practiceRegNumber: initial?.practiceRegNumber ?? "",
          practiceCompanyAddress: initial?.practiceCompanyAddress ?? "",
          practiceCompanyBio: initial?.practiceCompanyBio ?? "",
        });
        toast.success("Changes saved");
        router.refresh();
      } catch { toast.error("Could not save changes"); }
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6">
      {/* avatar row */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt="Profile" className={`w-20 h-20 rounded-full ring-2 ring-[#ffd716]/40 ${avatar === DEFAULT_AVATAR ? "object-contain p-4 bg-white dark:bg-white" : "object-cover"}`} />
          {uploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border border-[#e3e3e3] dark:border-white/15 text-sm font-medium text-[#1e1e1e] dark:text-white hover:border-[#ffd716] transition-colors disabled:opacity-50">{uploading ? "Uploading…" : "Upload new picture"}</button>
            <button type="button" onClick={removeAvatar} className="px-4 py-2 rounded-lg bg-[#f3f3f3] dark:bg-white/10 text-sm font-medium text-[#1e1e1e] dark:text-white hover:bg-[#e9e9e9] dark:hover:bg-white/15 transition-colors">Delete</button>
          </div>
          <p className="text-[11.5px] text-[#9a9a9a]">PNG, JPG or WEBP — up to 8MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Full name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </Field>
        <Field label="Availability">
          <SelectMenu placeholder="Select availability" value={availability} onChange={setAvailability} options={AVAIL_OPTIONS} />
        </Field>
        <Field label="Occupation">
          <SelectMenu placeholder="Select occupation" value={occupationPick} onChange={pickOccupation} options={OCCUPATIONS} />
        </Field>
        {occupationPick === "Others" && (
          <Field label="Specify your occupation">
            <input
              className={inputClass}
              value={customOccupation}
              onChange={(e) => { setCustomOccupation(e.target.value); setHeadline(e.target.value); }}
              placeholder="e.g. Crane Operator, Site Clerk"
            />
          </Field>
        )}
        <Field label="Address">
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Allen Avenue" />
        </Field>
        <Field label="State">
          <SelectMenu
            placeholder="Select state"
            value={stateName}
            onChange={(v) => { setStateName(v); setLga((cur) => (lgasFor(v).includes(cur) ? cur : "")); }}
            options={NG_STATES}
          />
        </Field>
        <Field label="Local Government Area" hint={stateName ? undefined : "Select a state first"}>
          <SelectMenu
            placeholder={stateName ? "Select LGA" : "Select a state first"}
            value={lga}
            onChange={setLga}
            options={lgasFor(stateName)}
          />
        </Field>
      </div>

      <Field label="Bio" hint={`${bio.length}/2,000`}>
        <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 2000))} rows={3} className={inputClass + " resize-none"} placeholder="A short summary about you and your work..." />
      </Field>

      <div className="flex items-center justify-end gap-3 py-4 mt-2 border-t border-[#ececec] dark:border-white/10">
        <GhostButton type="button" onClick={() => router.refresh()}>Cancel</GhostButton>
        <PrimaryButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>
    </form>
  );
}
