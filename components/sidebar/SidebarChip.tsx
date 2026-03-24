"use client";

import { useState } from "react";
import { theme } from "@/lib/theme";

interface SidebarChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function SidebarChip({ label, active, onClick }: SidebarChipProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 md:px-2 md:py-1 text-[12px] md:text-[11px] font-mono font-medium rounded-md min-h-[36px] md:min-h-0 transition-all duration-150 cursor-pointer"
      style={{
        background: active ? theme.black : hovered ? theme.borderGray : theme.lightGray,
        color: active ? theme.white : hovered ? theme.gray : theme.mediumGray,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}
