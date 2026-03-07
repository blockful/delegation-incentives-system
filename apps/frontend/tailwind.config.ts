import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Satoshi", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: [
          "36px",
          { lineHeight: "40px", fontWeight: "900", letterSpacing: "-0.02em" },
        ],
        h1: [
          "28px",
          { lineHeight: "34px", fontWeight: "900", letterSpacing: "-0.01em" },
        ],
        h2: ["22px", { lineHeight: "28px", fontWeight: "700" }],
        h3: ["18px", { lineHeight: "24px", fontWeight: "700" }],
        body: ["17px", { lineHeight: "26px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        label: [
          "11px",
          {
            lineHeight: "14px",
            fontWeight: "700",
            letterSpacing: "0.06em",
          },
        ],
        caption: ["12px", { lineHeight: "16px", fontWeight: "700" }],
      },
      colors: {
        primary: "#5298FF",
        "text-primary": "#1F2328",
        "text-body": "#57606A",
        "text-muted": "#8C959F",
        success: "#1A7F37",
        "success-bg": "#DAFBE1",
        surface: "#F6F8FA",
        border: "#D0D7DE",
        warning: "#CF6B00",
      },
      spacing: {
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "12px",
        "sp-4": "16px",
        "sp-5": "20px",
        "sp-6": "24px",
        "sp-8": "32px",
        "sp-10": "40px",
        "sp-12": "48px",
        "sp-16": "64px",
      },
      borderRadius: {
        r6: "6px",
        r8: "8px",
        r10: "10px",
        r12: "12px",
        r16: "16px",
        r20: "20px",
        rFull: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
