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
        ink: "#201b16",
        muted: "#70675d",
        paper: "#eceee5",
        panel: "#fffdf6",
        "panel-muted": "#f4efe4",
        line: "#d8cbbb",
        accent: "#d94b2b",
        teal: "#0f766e",
        lapis: "#315477",
        warn: "#b86b24",
        sidebar: "#1d1916"
      },
      fontFamily: {
        serif: [
          "Latin Modern Roman",
          "CMU Serif",
          "Computer Modern Serif",
          "STIX Two Text",
          "Noto Serif SC",
          "Source Han Serif SC",
          "Songti SC",
          "SimSun",
          "Cambria",
          "Times New Roman",
          "Georgia",
          "serif"
        ]
      },
      boxShadow: {
        soft: "0 28px 90px rgba(32, 27, 22, 0.13)",
        crisp: "0 14px 32px rgba(32, 27, 22, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
