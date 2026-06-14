"use client";

import { useRouter } from "next/navigation";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/signin");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="rounded-xl border border-cosmic-border bg-cosmic-surface/60 px-3 py-2 text-xs font-medium text-cosmic-muted transition-colors hover:bg-cosmic-surface2 hover:text-cosmic-ink"
    >
      {label}
    </button>
  );
}
