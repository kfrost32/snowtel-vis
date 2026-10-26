"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { theme } from "@/lib/theme";
import { MAX_COMPARE_YEARS, type useEnvelopeOptions } from "@/hooks/useEnvelopeOptions";
import { useDismiss } from "@/hooks/useDismiss";

interface EnvelopeChartActionsProps {
  options: ReturnType<typeof useEnvelopeOptions>;
  yearOptions: { year: number; label: string }[];
}

const buttonClass = "flex items-center gap-2 h-9 md:h-7 px-2 rounded-md text-xs font-medium font-sans transition-colors duration-150 hover:bg-[var(--c-hover)] cursor-pointer";

export default function EnvelopeChartActions({ options, yearOptions }: EnvelopeChartActionsProps) {
  const { selectedYears, addYear, removeYear, clearYears } = options;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const full = selectedYears.length >= MAX_COMPARE_YEARS;

  useDismiss(menuRef, open, () => setOpen(false));

  return (
    <div className="hidden md:flex items-center gap-1">
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={buttonClass}
          style={{ color: theme.darkGray, background: open ? "rgba(0,0,0,0.05)" : undefined }}
        >
          {selectedYears.length > 0 && (
            <span className="flex -space-x-1">
              {selectedYears.map(({ year, color }) => (
                <span key={year} className="w-2.5 h-2.5 rounded-full ring-2 ring-white" style={{ background: color }} />
              ))}
            </span>
          )}
          Compare years{selectedYears.length > 0 && ` (${selectedYears.length})`}
          <ChevronDown size={14} style={{ color: theme.gray }} />
        </button>
        {open && (
          <div
            role="listbox"
            aria-multiselectable
            className="absolute right-0 top-full mt-1 z-30 w-56 rounded-lg border shadow-lg overflow-hidden"
            style={{ background: theme.white, borderColor: theme.borderGray }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b font-mono text-xs" style={{ borderColor: theme.borderGray, color: theme.mediumGray }}>
              <span>{selectedYears.length}/{MAX_COMPARE_YEARS} selected</span>
              {selectedYears.length > 0 && (
                <button onClick={clearYears} className="cursor-pointer hover:underline" style={{ color: theme.gray }}>
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {yearOptions.map(({ year, label }) => {
                const selected = selectedYears.find((y) => y.year === year);
                const disabled = !selected && full;
                return (
                  <button
                    key={year}
                    role="option"
                    aria-selected={!!selected}
                    disabled={disabled}
                    onClick={() => (selected ? removeYear(year) : addYear(year))}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left font-mono text-xs transition-colors duration-100 enabled:hover:bg-[var(--c-hover)] enabled:cursor-pointer disabled:opacity-40"
                    style={{ color: theme.darkGray }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0"
                      style={{
                        borderColor: selected ? selected.color : theme.borderGray,
                        background: selected ? selected.color : theme.white,
                      }}
                    >
                      {selected && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
