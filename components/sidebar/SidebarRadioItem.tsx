"use client";

import { theme } from "@/lib/theme";

interface SidebarRadioItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function SidebarRadioItem({ label, active, onClick }: SidebarRadioItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 py-1.5 text-left transition-colors duration-150 cursor-pointer"
    >
      <div
        className="shrink-0 w-2 h-2 rounded-full"
        style={{ background: active ? theme.black : theme.borderGray }}
      />
      <span
        className="text-[12px] font-sans"
        style={{ color: active ? theme.black : theme.mediumGray, fontWeight: active ? 600 : 400 }}
      >
        {label}
      </span>
    </button>
  );
}
