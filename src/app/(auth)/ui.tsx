"use client";

// Shared auth UI kit for the (auth) route group.
// RTL-first: spacing/positioning use logical properties (ms-/me-/ps-/pe-) per
// guardrail G6 so these render correctly under the document's dir="rtl".

import { useId } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full rounded-2xl border border-neutral-200/80 bg-white p-7 shadow-sm sm:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  type = "text",
  ...rest
}: {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-describedby={hintId}
        className="rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-neutral-900 transition outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
        {...rest}
      />
      {hint && (
        <span id={hintId} className="text-xs text-neutral-400">
          {hint}
        </span>
      )}
    </div>
  );
}

export function SubmitButton({
  busy,
  busyLabel,
  children,
}: {
  busy?: boolean;
  busyLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 font-medium text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy && <Spinner />}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </button>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    error: "bg-red-50 text-red-700 border-red-100",
    success: "bg-green-50 text-green-800 border-green-100",
    info: "bg-amber-50 text-amber-800 border-amber-100",
  } as const;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm leading-relaxed ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-neutral-400">
      <span className="h-px flex-1 bg-neutral-200" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}
