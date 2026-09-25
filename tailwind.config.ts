import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Organic : sm 8, md 16, lg 28 ; cartes/dialogues 32 ; contrôles en pilule
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        card: "var(--radius-card)",
        pill: "999px",
      },
      spacing: {
        "organic-1": "var(--space-1)",
        "organic-2": "var(--space-2)",
        "organic-3": "var(--space-3)",
        "organic-4": "var(--space-4)",
        "organic-6": "var(--space-6)",
        "organic-8": "var(--space-8)",
      },
      boxShadow: {
        "organic-sm": "var(--shadow-sm)",
        "organic-md": "var(--shadow-md)",
        "organic-lg": "var(--shadow-lg)",
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        // Tokens Organic (hex exacts, cf. index.css)
        organic: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          text: "var(--color-text)",
          accent: "var(--color-accent)",
          "accent-2": "var(--color-accent-2)",
          divider: "var(--color-divider)",
        },
        "organic-neutral": {
          "100": "var(--color-neutral-100)",
          "200": "var(--color-neutral-200)",
          "300": "var(--color-neutral-300)",
          "400": "var(--color-neutral-400)",
          "500": "var(--color-neutral-500)",
          "600": "var(--color-neutral-600)",
          "700": "var(--color-neutral-700)",
          "800": "var(--color-neutral-800)",
          "900": "var(--color-neutral-900)",
        },
        "organic-accent": {
          "100": "var(--color-accent-100)",
          "200": "var(--color-accent-200)",
          "300": "var(--color-accent-300)",
          "400": "var(--color-accent-400)",
          "500": "var(--color-accent-500)",
          "600": "var(--color-accent-600)",
          "700": "var(--color-accent-700)",
          "800": "var(--color-accent-800)",
          "900": "var(--color-accent-900)",
        },
        "organic-accent-2": {
          "100": "var(--color-accent-2-100)",
          "200": "var(--color-accent-2-200)",
          "300": "var(--color-accent-2-300)",
          "400": "var(--color-accent-2-400)",
          "500": "var(--color-accent-2-500)",
          "600": "var(--color-accent-2-600)",
          "700": "var(--color-accent-2-700)",
          "800": "var(--color-accent-2-800)",
          "900": "var(--color-accent-2-900)",
        },
        momo: { DEFAULT: "#ffcb05", foreground: "#1a1a1a" },
        "orange-money": { DEFAULT: "#ff7900", foreground: "#1a1a1a" },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        serif: ["var(--font-heading)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        medical: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
