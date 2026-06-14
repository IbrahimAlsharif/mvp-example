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
      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
    >
      {label}
    </button>
  );
}
