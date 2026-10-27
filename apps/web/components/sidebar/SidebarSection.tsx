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
        className="group w-full flex items-center justify-between px-4 py-3 md:py-2.5 min-h-[44px] md:min-h-0 cursor-pointer"
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider font-sans select-none text-[var(--c-gray)] group-hover:text-[var(--c-black)] transition-colors"
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {trailing && <span onClick={(e) => e.stopPropagation()}>{trailing}</span>}
          <ChevronDown
            size={16}
            className="text-[var(--c-medium-gray)] group-hover:text-[var(--c-black)]"
            style={{
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 150ms, color 150ms",
            }}
          />
        </div>
      </button>
      {open && <div className={flush ? "pb-1" : "px-4 pb-3"}>{children}</div>}
    </div>
  );
}
