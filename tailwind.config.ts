import type { Config } from "tailwindcss";

// RTL-first: use logical properties (ms-/me-/ps-/pe-/start-/end-) in components
// rather than left/right so layouts render correctly under dir="rtl" (G6).
//
// Brand identity: blue primary (`brand`) + orange accent (`accent`) for CTAs and
// notifications, plus animation primitives for a modern, social-network feel.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Cairo (Arabic-first) loaded via next/font as the --font-cairo variable,
        // with a system fallback while it swaps in.
        sans: ["var(--font-cairo)", "system-ui", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        // Primary — trustworthy blue
        brand: {
          DEFAULT: "#2563EB",
          50: "#EFF5FF",
          100: "#DBE8FE",
          200: "#BFD7FE",
          300: "#93BBFD",
          400: "#609AFA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4FD8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Accent — warm orange for CTAs, highlights, notifications
        accent: {
          DEFAULT: "#F97316",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        // Timeline command-center theme — LIGHT, joyful palette matching the
        // app identity (brand blue + accent orange + glass). Scoped to
        // .timeline-cosmic. Token names kept (`cosmic-*`) so the whole timeline
        // tree flips palette by value, not by rewriting every class name.
        cosmic: {
          bg: "#FFFFFF", // bright base (was the deep navy)
          surface: "#FFFFFF", // panels / cards
          surface2: "#EFF5FF", // raised insets / hover (brand-50)
          border: "#DBE8FE", // soft brand hairline (brand-100)
          ink: "#1E293B", // primary text on light (slate-800)
          muted: "#64748B", // secondary text (slate-500)
          blue: "#2563EB", // brand blue (past / primary)
          teal: "#0D9488", // deepened teal (legible on white)
          purple: "#7C3AED", // future / plans (violet-600)
          amber: "#EA580C", // NOW / highlights → warm accent orange
          rose: "#E11D48", // rose-600
        },
      },
      backgroundImage: {
        // Signature blue→orange diagonal used on CTAs and brand surfaces.
        "brand-gradient": "linear-gradient(135deg, #2563EB 0%, #4F46E5 45%, #F97316 130%)",
        "accent-gradient": "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
        "app-canvas":
          "radial-gradient(1200px 600px at 100% -10%, #DBE8FE 0%, transparent 55%), radial-gradient(900px 500px at -10% 10%, #FFEDD5 0%, transparent 50%), linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
        // Timeline canvas — LIGHT, airy aurora that matches the app identity:
        // soft blue + orange blooms over a near-white gradient. Scoped to
        // .timeline-cosmic so it never leaks to other pages.
        "cosmic-canvas":
          "radial-gradient(1100px 700px at 85% -8%, rgba(37, 99, 235, 0.10) 0%, transparent 55%), radial-gradient(950px 620px at -5% 108%, rgba(249, 115, 22, 0.10) 0%, transparent 55%), linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 60%, #EFF5FF 100%)",
      },
      boxShadow: {
        brand: "0 10px 30px -10px rgba(37, 99, 235, 0.35)",
        accent: "0 10px 30px -10px rgba(249, 115, 22, 0.45)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -12px rgba(15, 23, 42, 0.12)",
        // Soft colored glows for nodes/badges on the LIGHT timeline surface —
        // a tinted ring + diffuse drop shadow instead of dark-mode neon bloom.
        "glow-blue": "0 0 0 1px rgba(37,99,235,0.18), 0 8px 22px -8px rgba(37,99,235,0.45)",
        "glow-purple": "0 0 0 1px rgba(124,58,237,0.18), 0 8px 22px -8px rgba(124,58,237,0.45)",
        "glow-amber": "0 0 0 1px rgba(234,88,12,0.20), 0 8px 24px -8px rgba(234,88,12,0.50)",
        "glow-teal": "0 0 0 1px rgba(13,148,136,0.18), 0 8px 22px -8px rgba(13,148,136,0.45)",
        "cosmic-panel": "0 1px 0 rgba(255,255,255,0.7) inset, 0 20px 60px -24px rgba(37,99,235,0.30)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.9" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "70%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
