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
        sans: ["system-ui", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
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
      },
      backgroundImage: {
        // Signature blue→orange diagonal used on CTAs and brand surfaces.
        "brand-gradient": "linear-gradient(135deg, #2563EB 0%, #4F46E5 45%, #F97316 130%)",
        "accent-gradient": "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
        "app-canvas":
          "radial-gradient(1200px 600px at 100% -10%, #DBE8FE 0%, transparent 55%), radial-gradient(900px 500px at -10% 10%, #FFEDD5 0%, transparent 50%), linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
      },
      boxShadow: {
        brand: "0 10px 30px -10px rgba(37, 99, 235, 0.35)",
        accent: "0 10px 30px -10px rgba(249, 115, 22, 0.45)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -12px rgba(15, 23, 42, 0.12)",
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
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
