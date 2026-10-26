import type { CSSProperties } from "react";
import { theme } from "@/lib/theme";

export const titleColorVars = { "--title": theme.black, "--subtle": theme.gray } as CSSProperties;

export default function ChartTitle({ name, label }: { name: string; label: string }) {
  return (
    <span style={titleColorVars}>
      <span className="hidden" data-export-reveal="inline">{name} </span>
      <span>{label}</span>
    </span>
  );
}
