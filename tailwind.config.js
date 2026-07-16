/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF8",
        surface: "#FFFFFF",
        ink: "#1B2430",
        muted: "#6B7280",
        line: "#E8E6E1",
        primary: {
          DEFAULT: "#2563eb",
          light: "#eff6ff",
          dark: "#1d4ed8",
        },
        good: "#16A34A",
        bad: "#E11D48",
        warn: "#F59E0B",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27,36,48,0.04), 0 8px 24px rgba(27,36,48,0.06)",
      },
    },
  },
  plugins: [],
};
