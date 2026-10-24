import type { ReactNode } from "react";
import { theme } from "@snotel/core/theme";

interface LegendItemProps {
  children: ReactNode;
  hideOnMobile?: boolean;
}

export default function LegendItem({ children, hideOnMobile = false }: LegendItemProps) {
  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-[10px] ${hideOnMobile ? "max-md:hidden" : ""}`}
      data-export-reveal={hideOnMobile ? "flex" : undefined}
      style={{ color: theme.mediumGray }}
    >
      {children}
    </div>
  );
}
