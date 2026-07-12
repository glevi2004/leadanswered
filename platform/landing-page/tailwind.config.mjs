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
        /* brand = the two AbacatePay primaries: yellow-green #9EEA6C + brown-green #244C4E,
           with their vivid accent #58C411 in the middle. (Sarah's demo bubbles stay
           iMessage green — that's the SMS metaphor, not brand chrome.) */
        brand: {
          50: "#e6f9da",
          100: "#d4f1b8",
          200: "#bfe998",
          400: "#9eea6c",
          500: "#7fdc4a",
          600: "#58c411",
          700: "#468f14",
          800: "#2f6b10",
          900: "#244c4e",
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
