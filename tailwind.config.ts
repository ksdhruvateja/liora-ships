import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f6f7fb",
        ink: "#1b2c6b",
        muted: "#5c6480",
        gold: "#7c5cff",
        violet: {
          400: "#9b7cff",
          500: "#7c5cff",
          600: "#6a48f0",
        },
        brand: {
          50: "#f3efff",
          100: "#e4dcff",
          500: "#7c5cff",
          600: "#6a48f0",
          700: "#5536c9",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(27, 44, 107, 0.4)",
        card: "0 18px 50px -28px rgba(27, 44, 107, 0.4)",
      },
      borderRadius: {
        photo: "2.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
