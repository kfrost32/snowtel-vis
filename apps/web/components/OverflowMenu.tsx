"use client";

import { useRef, useState } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { theme } from "@/lib/theme";
import { useDismiss } from "@/hooks/useDismiss";

export interface OverflowMenuItem {
  label: string;
  onSelect: () => void;
  checked?: boolean;
  disabled?: boolean;
}

export default function OverflowMenu({ items }: { items: OverflowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative" data-export-btn>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More options"
        className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--c-hover)] cursor-pointer"
        style={{ color: theme.gray }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] py-1 rounded-lg border shadow-lg origin-top-right motion-safe:animate-menu-in"
          style={{ background: theme.white, borderColor: theme.borderGray }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={item.checked}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                if (item.checked === undefined) setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left font-sans text-sm transition-colors hover:bg-[var(--c-hover)] cursor-pointer disabled:opacity-50"
              style={{ color: theme.black }}
            >
              <span className="w-4 shrink-0">{item.checked && <Check size={16} />}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
