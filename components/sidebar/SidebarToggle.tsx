"use client";

import { theme } from "@/lib/theme";

interface SidebarToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function SidebarToggle({ label, description, checked, onChange }: SidebarToggleProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="font-sans text-xs font-medium" style={{ color: theme.darkGray }}>{label}</div>
        {description && (
          <div className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors duration-150 cursor-pointer shrink-0"
        style={{ background: checked ? theme.black : theme.borderGray }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-150"
          style={{ background: theme.white, transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}
