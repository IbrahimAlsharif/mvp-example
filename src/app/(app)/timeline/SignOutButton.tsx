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
      className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-all duration-200 hover:border-brand hover:bg-brand-50 hover:text-brand-700"
    >
      {label}
    </button>
  );
}
