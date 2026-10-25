import { PlatformColor } from "react-native";

export const colors = {
  label: PlatformColor("label"),
  secondaryLabel: PlatformColor("secondaryLabel"),
  tertiaryLabel: PlatformColor("tertiaryLabel"),
  separator: PlatformColor("separator"),
  background: PlatformColor("systemBackground"),
  groupedBackground: PlatformColor("systemGroupedBackground"),
  cell: PlatformColor("secondarySystemGroupedBackground"),
  fill: PlatformColor("tertiarySystemFill"),
  tint: PlatformColor("systemBlue"),
  favorite: PlatformColor("systemYellow"),
};

export const numeric = { fontVariant: ["tabular-nums" as const] };
