"use client";

import { theme } from "@/lib/theme";

interface SidebarChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function SidebarChip({ label, active, onClick }: SidebarChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-[11px] font-mono font-medium rounded-md transition-all duration-150 cursor-pointer"
      style={{
        background: active ? theme.black : theme.lightGray,
        color: active ? theme.white : theme.mediumGray,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = theme.borderGray;
          e.currentTarget.style.color = theme.gray;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = theme.lightGray;
          e.currentTarget.style.color = theme.mediumGray;
        }
      }}
    >
      {label}
    </button>
  );
}
