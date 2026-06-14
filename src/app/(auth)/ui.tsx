"use client";

// Shared auth UI kit for the (auth) route group — also the app-wide design-system
// primitives. RTL-first: spacing/positioning use logical properties (ms-/me-/
// ps-/pe-) per guardrail G6 so these render correctly under dir="rtl".
//
// Identity: blue primary + orange accent, gradients, and micro-interactions
// (hover lift, active press, focus rings, entrance animation).

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
    <section className="w-full animate-fade-in-up rounded-3xl border border-white/60 bg-white/90 p-7 shadow-card backdrop-blur-sm sm:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">{subtitle}</p>
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
      <label htmlFor={id} className="text-sm font-semibold text-neutral-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-describedby={hintId}
        className="rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 shadow-sm transition-all duration-200 outline-none placeholder:text-neutral-400 hover:border-neutral-400 focus:border-brand focus:ring-4 focus:ring-brand/15"
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
      className="group mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-gradient px-5 py-3 font-bold text-white shadow-accent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/40 active:translate-y-0 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {busy && <Spinner />}
      <span>{busy && busyLabel ? busyLabel : children}</span>
    </button>
  );
}

// Secondary button — blue outline, for non-primary actions.
export function GhostButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2.5 font-semibold text-neutral-800 transition-all duration-200 hover:border-brand hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
    </a>
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
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-brand-50 text-brand-800 border-brand-200",
    info: "bg-accent-50 text-accent-800 border-accent-200",
  } as const;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`animate-fade-in rounded-xl border p-3 text-sm leading-relaxed ${tones[tone]}`}
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
