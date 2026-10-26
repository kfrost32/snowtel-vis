export * from "@snotel/core/theme";

export const theme = {
  white: "var(--c-white)",
  offWhite: "var(--c-off-white)",
  lightGray: "var(--c-light-gray)",
  borderGray: "var(--c-border-gray)",
  mediumGray: "var(--c-medium-gray)",
  gray: "var(--c-gray)",
  darkGray: "var(--c-dark-gray)",
  black: "var(--c-black)",
};

export const chartTooltipStyle = {
  background: "var(--c-white)",
  border: "1px solid var(--c-border-gray)",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "8px 12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  color: "var(--c-black)",
};

export const chartCursorStyle = { fill: "var(--c-hover)" };
