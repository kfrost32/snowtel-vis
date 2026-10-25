export const theme = {
  white: "#FFFFFF",
  offWhite: "#F8FAFB",
  lightGray: "#F0F4F5",
  borderGray: "#DDE3E6",
  mediumGray: "#8A9BA3",
  gray: "#5A6B73",
  darkGray: "#2A3238",
  black: "#1A2026",
};

export const snowColors = {
  wellBelow: "#DC2626",
  below: "#F59E0B",
  nearNormal: "#22C55E",
  above: "#3B82F6",
  wellAbove: "#1D4ED8",

  swe: "#3B82F6",
  snowDepth: "#8B5CF6",
  precip: "#06B6D4",
  temp: "#EF4444",
  median: "#8796A8",
  envelopeMax: "#3B82F6",
  envelopeMin: "#F87171",
  medianPeak: "#16A34A",
  freezing: "#93C5FD",
  currentYear: "#F59E0B",
  freshSnow: "#06B6D4",
  lightSnow: "#06B6D4",
  averageSnow: "#3B82F6",
  heavySnow: "#64748B",
};

export const percentileBands = [
  { key: "b0", color: "#E98A8A" },
  { key: "b1", color: "#F6DC85" },
  { key: "b2", color: "#E3F5DE" },
  { key: "b3", color: "#9AD2E0" },
  { key: "b4", color: "#7AA0DD" },
] as const;

export const compareYearColors = ["#8B5CF6", "#0D9488", "#DB2777", "#EA580C"];

export const chartColors = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  purpleDark: "#7C3AED",
  orange: "#F59E0B",
  orangeDark: "#D97706",
  red: "#EF4444",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  indigo: "#6366F1",
};

export const yearColors = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

export const chartTooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #DDE3E6",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "8px 12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const chartCursorStyle = { fill: "rgba(0, 0, 0, 0.04)" };

export const glassmorphicButtonStyle = {
  background: "rgba(255,255,255,0.18)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.3)",
} as const;
