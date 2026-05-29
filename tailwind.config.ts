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
        ink: "#241f1a",
        muted: "#746a5f",
        paper: "#efebe1",
        panel: "#fffdf7",
        "panel-muted": "#f6f1e8",
        line: "#d7ccbd",
        accent: "#d94b2b",
        teal: "#11746f",
        warn: "#b86b24",
        sidebar: "#211c18"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(36, 31, 26, 0.10)",
        crisp: "0 12px 28px rgba(36, 31, 26, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
