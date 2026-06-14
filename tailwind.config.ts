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
        // Cosmic theme — dark surfaces + neon accents, scoped to the timeline
        // command center (.timeline-cosmic). Not used by the light app identity.
        cosmic: {
          bg: "#070B1A", // deepest background
          surface: "#0E1430", // panels / cards
          surface2: "#141B3D", // raised insets
          border: "#26305C", // hairline dividers
          ink: "#E6ECFF", // primary text on dark
          muted: "#8C97C2", // secondary text
          blue: "#38BDF8", // neon cyan-blue (past / primary)
          teal: "#2DD4BF",
          purple: "#A855F7", // future / plans
          amber: "#FBBF24", // NOW / highlights
          rose: "#FB7185",
        },
      },
      backgroundImage: {
        // Signature blue→orange diagonal used on CTAs and brand surfaces.
        "brand-gradient": "linear-gradient(135deg, #2563EB 0%, #4F46E5 45%, #F97316 130%)",
        "accent-gradient": "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
        "app-canvas":
          "radial-gradient(1200px 600px at 100% -10%, #DBE8FE 0%, transparent 55%), radial-gradient(900px 500px at -10% 10%, #FFEDD5 0%, transparent 50%), linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
        // Cosmic canvas — dark navy/black with faint nebula glows, scoped to the
        // timeline "command center" surface (.timeline-cosmic). Independent of
        // the light app identity so it never leaks to other pages.
        "cosmic-canvas":
          "radial-gradient(1000px 700px at 80% -5%, rgba(56, 189, 248, 0.10) 0%, transparent 55%), radial-gradient(900px 600px at 0% 110%, rgba(168, 85, 247, 0.12) 0%, transparent 55%), linear-gradient(180deg, #060A18 0%, #0A0F24 60%, #070B1A 100%)",
      },
      boxShadow: {
        brand: "0 10px 30px -10px rgba(37, 99, 235, 0.35)",
        accent: "0 10px 30px -10px rgba(249, 115, 22, 0.45)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -12px rgba(15, 23, 42, 0.12)",
        // Cosmic neon glows for nodes/badges on the dark timeline surface.
        "glow-blue": "0 0 0 1px rgba(56,189,248,0.35), 0 0 18px -2px rgba(56,189,248,0.55)",
        "glow-purple": "0 0 0 1px rgba(168,85,247,0.35), 0 0 18px -2px rgba(168,85,247,0.55)",
        "glow-amber": "0 0 0 1px rgba(251,191,36,0.4), 0 0 22px -2px rgba(251,191,36,0.6)",
        "glow-teal": "0 0 0 1px rgba(45,212,191,0.35), 0 0 18px -2px rgba(45,212,191,0.55)",
        "cosmic-panel": "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -28px rgba(0,0,0,0.8)",
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
