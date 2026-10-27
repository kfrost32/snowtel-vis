"use client";

import { theme } from "@/lib/theme";

interface SidebarSegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export default function SidebarSegmented<T extends string>({ options, value, onChange }: SidebarSegmentedProps<T>) {
  return (
    <div className="flex p-0.5 rounded-lg" style={{ background: "var(--c-hairline)" }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => !selected && onChange(option.value)}
            className="flex-1 py-1.5 md:py-1 max-md:min-h-[36px] rounded-md text-xs font-sans font-medium transition-all duration-150 cursor-pointer"
            style={{
              background: selected ? theme.white : "transparent",
              color: selected ? theme.black : theme.gray,
              boxShadow: selected ? "0 1px 2px rgba(15, 23, 42, 0.12), 0 0 0 0.5px rgba(15, 23, 42, 0.06)" : "none",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
