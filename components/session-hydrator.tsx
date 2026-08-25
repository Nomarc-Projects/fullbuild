"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useAuth } from "@/lib/store/auth";
import { getMyAvatar } from "@/lib/services/account";

export function SessionHydrator() {
  const { data, isPending } = useSession();
  const signIn = useAuth((s) => s.signIn);
  const signOut = useAuth((s) => s.signOut);

  useEffect(() => {
    if (isPending) return;
    if (data?.user) {
      const u = data.user as { name?: string; email?: string; image?: string | null };
      const name = u.name ?? "";
      const email = u.email ?? "";
      const avatar = u.image ?? undefined;
      signIn({ name, email, avatar });
      // Always fetch the stored profile/company avatar so the sidebar shows
      // the picture the user actually uploaded, not just the OAuth image.
      getMyAvatar()
        .then((url) => { if (url) signIn({ name, email, avatar: url }); })
        .catch(() => {});
    } else {
      signOut();
    }
  }, [data, isPending, signIn, signOut]);

  return null;
}
