"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Modal, Field, inputClass, GhostButton, PrimaryButton } from "@/components/ui/modal";
import { inviteAdminByEmail } from "@/lib/services/admin";

export function InviteAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await inviteAdminByEmail(email.trim());
      if (!res.ok) { toast.error(res.error ?? "Couldn't invite"); return; }
      toast.success(`${email} is now an admin`);
      setOpen(false);
      setEmail("");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffd716] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1e1e1e] transition-colors hover:bg-[#e6c114]">
        <UserPlus size={13} /> Invite New Admin
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Invite New Admin" maxWidth="max-w-sm">
        <Field label="Email address" hint="Must already have a Nomarc account">
          <input className={inputClass} autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" type="email" />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setOpen(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={send} disabled={sending || !email.trim()}>{sending ? "Sending…" : "Grant admin access"}</PrimaryButton>
        </div>
      </Modal>
    </>
  );
}
