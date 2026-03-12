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
        espresso: "#1C0A04",
        amber:    "#FF8500",
        magenta:  "#D63B7A",
        mustard:  "#D4A017",
        rust:     "#C84B1E",
        gold:     "#C9A84C",
        cream:    "#F5EDD6",
        teal:     "#2A5C5E",
      },
      fontFamily: {
        serif:  ["var(--font-playfair)", "Georgia", "serif"],
        sans:   ["var(--font-inter)", "system-ui", "sans-serif"],
        grotesk: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
