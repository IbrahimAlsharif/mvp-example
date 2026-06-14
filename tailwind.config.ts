import type { Config } from "tailwindcss";

// RTL-first: use logical properties (ms-/me-/ps-/pe-/start-/end-) in components
// rather than left/right so layouts render correctly under dir="rtl" (G6).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Tahoma", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
