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
        paper: "#f5f7fc",
        ink: "#0c1a33",
        muted: "#5c6480",
        gold: "#a8ec3a",
        // Brand palette from the Liora logo: navy (ink), electric blue, lime.
        // The accent scale is also kept under "violet" so existing classes keep working.
        violet: {
          400: "#3d6bff",
          500: "#0446f5",
          600: "#0338c7",
        },
        ocean: {
          50: "#eef3ff",
          100: "#dbe5ff",
          200: "#b6caff",
          300: "#7fa0ff",
          400: "#3d6bff",
          500: "#0446f5",
          600: "#0338c7",
          700: "#032c99",
          900: "#06163f",
        },
        lime: {
          300: "#c6f47a",
          400: "#a8ec3a",
          500: "#8fd41f",
        },
        mist: "#e6edfa",
        brand: {
          50: "#eef3ff",
          100: "#dbe5ff",
          500: "#0446f5",
          600: "#0338c7",
          700: "#032c99",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "\"SF Pro Display\"", "var(--font-sans)", "system-ui", "sans-serif"],
        display: ["-apple-system", "BlinkMacSystemFont", "\"SF Pro Display\"", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(27, 44, 107, 0.4)",
        card: "0 18px 50px -28px rgba(27, 44, 107, 0.4)",
        lift: "0 40px 80px -40px rgba(13, 31, 58, 0.55)",
      },
      borderRadius: {
        photo: "2.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
