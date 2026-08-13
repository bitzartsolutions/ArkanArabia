// Arkan Arabia Logistics - Tailwind Configuration
// Centralized configuration for all HTML pages

tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-dim": "#dcd9d9",
        "primary-fixed-dim": "#b0c6ff",
        "surface-tint": "#315bb0",
        "on-surface-variant": "#434652",
        "surface-container-low": "#f6f3f2",
        "inverse-surface": "#313030",
        "error-container": "#ffdad6",
        "primary-fixed": "#d9e2ff",
        "primary": "#00337d",
        "on-secondary-container": "#26348a",
        "on-background": "#1c1b1b",
        "on-error": "#ffffff",
        "on-primary-fixed-variant": "#0d4297",
        "on-secondary": "#ffffff",
        "surface-container-high": "#eae7e7",
        "outline-variant": "#c3c6d4",
        "on-tertiary-container": "#bac1c8",
        "tertiary-fixed": "#dce3eb",
        "tertiary": "#31383f",
        "primary-container": "#1b4a9f",
        "inverse-primary": "#b0c6ff",
        "on-primary-fixed": "#001945",
        "secondary-fixed-dim": "#bbc3ff",
        "on-tertiary": "#ffffff",
        "on-surface": "#1c1b1b",
        "tertiary-container": "#484f56",
        "on-secondary-fixed-variant": "#303e94",
        "on-primary-container": "#a6bfff",
        "on-primary": "#ffffff",
        "surface-container": "#f0edec",
        "on-tertiary-fixed-variant": "#40484e",
        "surface-bright": "#fcf9f8",
        "on-error-container": "#93000a",
        "error": "#ba1a1a",
        "outline": "#747783",
        "secondary-fixed": "#dee0ff",
        "secondary": "#4957ad",
        "secondary-container": "#94a2fe",
        "surface": "#fcf9f8",
        "background": "#fcf9f8",
        "surface-container-lowest": "#ffffff",
        "tertiary-fixed-dim": "#c0c7cf",
        "inverse-on-surface": "#f3f0ef",
        "on-tertiary-fixed": "#151c22",
        "surface-container-highest": "#e5e2e1",
        "surface-variant": "#e5e2e1",
        "on-secondary-fixed": "#000e5e"
      },
      borderRadius: {
        "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem",
        "2xl": "20px", "3xl": "24px", "full": "9999px"
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"],
        "h1": ["Manrope","sans-serif"], "h2": ["Manrope","sans-serif"],
        "h3": ["Manrope","sans-serif"], "body": ["Inter","sans-serif"],
        "body-md": ["Inter","sans-serif"],
        "label-sm": ["Inter","sans-serif"]
      },
      spacing: {
        "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px",
        "xl": "48px", "2xl": "64px",
        "container-max": "1280px"
      },
      fontSize: {
        "display-lg": ["3rem", { lineHeight: "1.1", fontWeight: "800" }],
        "display-md": ["2.25rem", { lineHeight: "1.15", fontWeight: "700" }],
        "title-lg": ["1.375rem", { lineHeight: "1.3", fontWeight: "700" }],
        "title-md": ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-md": ["0.875rem", { lineHeight: "1.6" }],
        "label-sm": ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }]
      }
    }
  }
}
