/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    borderRadius: {
      none: "0",
      DEFAULT: "0",
      sm: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "0",
    },
    extend: {
      colors: {
        bg: {
          dark: "#080202",
          light: "#110505",
        },
        crimson: "#D32F2F",
        "bright-red": "#FF3333",
        muted: "#B07A7A",
        "non-text": "#8A5A5A",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const cornerSize = "var(--hud-corner-size, 12px)";
      const cornerColor = "var(--hud-corner-color, #8A5A5A)";

      const makeCorner = (position) => {
        const isTop = position.includes("top");
        const isLeft = position.includes("left");
        const gradientH = `linear-gradient(${isLeft ? "to right" : "to left"}, ${cornerColor} 100%, transparent 100%)`;
        const gradientV = `linear-gradient(${isTop ? "to bottom" : "to top"}, ${cornerColor} 100%, transparent 100%)`;

        return {
          content: '""',
          position: "absolute",
          [isTop ? "top" : "bottom"]: "0",
          [isLeft ? "left" : "right"]: "0",
          width: cornerSize,
          height: cornerSize,
          backgroundImage: `${gradientH}, ${gradientV}`,
          backgroundSize: `${cornerSize} 1px, 1px ${cornerSize}`,
          backgroundPosition: `${isLeft ? "left" : "right"} ${isTop ? "top" : "bottom"}, ${isLeft ? "left" : "right"} ${isTop ? "top" : "bottom"}`,
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
        };
      };

      addUtilities({
        ".hud-corners": {
          "--hud-corner-size": "12px",
          "--hud-corner-color": "#8A5A5A",
          position: "relative",
          "&::before": makeCorner("top-left"),
          "&::after": makeCorner("top-right"),
          "& > .hud-corners-bottom": {
            position: "absolute",
            inset: "0",
            pointerEvents: "none",
            "&::before": makeCorner("bottom-left"),
            "&::after": makeCorner("bottom-right"),
          },
        },
        ".hud-corners-active": {
          "--hud-corner-color": "#D32F2F",
        },
      });
    },
  ],
};
