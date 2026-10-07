/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18323a",
        muted: "#64777b",
        canvas: "#f4f7f5",
        brand: "#087e75",
        "brand-dark": "#07665f",
      },
      boxShadow: {
        card: "0 8px 30px rgba(29, 62, 65, 0.06)",
      },
    },
  },
  plugins: [],
};
