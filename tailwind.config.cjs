/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Outfit", "sans-serif"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "primary": "#007bff",
          "base-100": "#0f172a",
          "base-content": "#f8fafc",
          "oklch": false, 
          "oklab": false,
          "--p": "211 100% 50%", 
          "--b1": "222 47% 11%",
          "--bc": "210 40% 98%",
        },
      },
    ],
    logs: false,
  },
}
