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
      className="group flex items-center gap-2.5 py-1.5 min-h-[40px] md:min-h-0 text-left cursor-pointer"
    >
      <div
        className={`shrink-0 w-2.5 h-2.5 md:w-2 md:h-2 rounded-full transition-opacity ${active ? "" : "opacity-40 group-hover:opacity-70"}`}
        style={{ background: active ? theme.black : theme.mediumGray }}
      />
      <span
        className={`text-sm font-sans transition-colors ${active ? "font-semibold text-[var(--c-black)]" : "text-[var(--c-gray)] group-hover:text-[var(--c-black)]"}`}
      >
        {label}
      </span>
    </button>
  );
}
