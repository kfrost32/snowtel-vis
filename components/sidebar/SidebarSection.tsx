"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { theme } from "@/lib/theme";

interface SidebarSectionProps {
  label: string;
  defaultOpen?: boolean;
  trailing?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}

export default function SidebarSection({ label, defaultOpen = true, trailing, flush = false, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b" style={{ borderColor: theme.borderGray }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-black/[0.02] transition-colors"
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider font-sans select-none"
          style={{ color: theme.mediumGray }}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {trailing && <span onClick={(e) => e.stopPropagation()}>{trailing}</span>}
          <ChevronDown
            size={12}
            style={{
              color: theme.gray,
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 150ms",
            }}
          />
        </div>
      </button>
      {open && <div className={flush ? "pb-1" : "px-4 pb-3"}>{children}</div>}
    </div>
  );
}
