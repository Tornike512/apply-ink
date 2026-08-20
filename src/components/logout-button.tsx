"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-apply-ink": "1" },
      });
    } finally {
      queryClient.clear();
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      className="whitespace-nowrap rounded-xl border border-sand bg-surface/75 px-3 py-2 text-sm font-semibold text-espresso transition-colors hover:bg-surface disabled:opacity-60 sm:px-4"
    >
      {pending ? "Logging out..." : "Log out"}
    </button>
  );
}
