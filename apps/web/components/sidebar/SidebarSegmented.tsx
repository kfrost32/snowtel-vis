"use client";

import { theme } from "@/lib/theme";

interface SidebarSegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export default function SidebarSegmented<T extends string>({ options, value, onChange }: SidebarSegmentedProps<T>) {
  const index = options.findIndex((option) => option.value === value);
  return (
    <div className="relative flex p-0.5 rounded-lg" style={{ background: "var(--c-hairline)" }}>
      {index >= 0 && (
        <div
          aria-hidden
          className="absolute top-0.5 bottom-0.5 left-0.5 rounded-md transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{
            width: `calc((100% - 4px) / ${options.length})`,
            transform: `translateX(${index * 100}%)`,
            background: theme.white,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12), 0 0 0 0.5px rgba(15, 23, 42, 0.06)",
          }}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => !selected && onChange(option.value)}
            className={`relative flex-1 py-1.5 md:py-1 max-md:min-h-[36px] rounded-md text-xs font-sans font-medium transition-colors duration-150 cursor-pointer ${selected ? "text-[var(--c-black)]" : "text-[var(--c-gray)] hover:text-[var(--c-black)]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
