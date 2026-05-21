import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        muted: "#5d6a63",
        paper: "#f7f5ef",
        line: "#d9d6cb",
        accent: "#1e7f68",
        warn: "#b25b2a"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 33, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
