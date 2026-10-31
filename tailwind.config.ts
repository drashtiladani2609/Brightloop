import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1440px" } },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        lime: { DEFAULT: "var(--lime)", deep: "var(--lime-deep)" },
        cobalt: "var(--cobalt)",
        coral: "var(--coral)",
        warn: "var(--warn)",
        rail: "var(--rail)"
      },
      borderRadius: { none: "0", sm: "1px", DEFAULT: "2px", md: "2px", lg: "3px", xl: "4px", "2xl": "4px", "3xl": "6px" },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      fontSize: {
        "2xs": ["9.5px", { lineHeight: "1.2" }],
        xs: ["11px", { lineHeight: "1.5" }],
        sm: ["12.5px", { lineHeight: "1.55" }],
        base: ["13.5px", { lineHeight: "1.6" }]
      },
      boxShadow: {
        offset: "3px 3px 0 0 var(--offset)",
        "offset-lg": "6px 6px 0 0 var(--offset)",
        lime: "3px 3px 0 0 var(--lime)"
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } }
      },
      animation: { "fade-up": "fade-up .45s cubic-bezier(.22,1,.36,1) both" }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
export default config
