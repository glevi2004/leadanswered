import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#101828",
          800: "#1c1d22",
          700: "#2e3038",
          500: "#5e616e",
          400: "#7b7f8c",
        },
        paper: {
          50: "#ffffff",
          100: "#fafafa",
          200: "#f3f5f8",
          300: "#e9edf3",
          400: "#dde3ec",
          500: "#c2cad8",
        },
        /* brand = iMessage bubble green */
        brand: {
          50: "#ecfdf2",
          100: "#d4f8e0",
          200: "#9ceeb4",
          400: "#4be06a",
          500: "#30d158",
          600: "#22b94a",
          700: "#1a9c3e",
          800: "#15732e",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.05)",
        "card-hover":
          "0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 28px rgba(16, 24, 40, 0.09)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.8s ease-out forwards",
        marquee: "marquee 42s linear infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [typography],
};
