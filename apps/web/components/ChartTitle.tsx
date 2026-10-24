import type { CSSProperties } from "react";
import { theme } from "@snotel/core/theme";

export const titleColorVars = { "--title": theme.black, "--subtle": theme.gray } as CSSProperties;

export default function ChartTitle({ name, label }: { name: string; label: string }) {
  return (
    <span style={titleColorVars}>
      <span className="max-md:hidden" data-export-reveal="inline">{name} </span>
      <span className="font-normal text-[var(--subtle)] md:text-base max-md:font-medium max-md:text-[var(--title)]">{label}</span>
    </span>
  );
}
