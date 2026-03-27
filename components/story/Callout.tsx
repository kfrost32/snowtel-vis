"use client";

import { theme, snowColors } from "@/lib/theme";

interface CalloutProps {
  value: string;
  caption: string;
  color?: string;
}

export default function Callout({ value, caption, color = snowColors.wellBelow }: CalloutProps) {
  return (
    <div className="py-8 sm:py-10 my-8 sm:my-10 border-l-4 pl-6 sm:pl-8" style={{ borderColor: color }}>
      <div
        className="font-sans font-bold tracking-tighter text-4xl sm:text-5xl md:text-6xl mb-2"
        style={{ color }}
      >
        {value}
      </div>
      <div className="font-sans text-base sm:text-lg" style={{ color: theme.gray }}>
        {caption}
      </div>
    </div>
  );
}
