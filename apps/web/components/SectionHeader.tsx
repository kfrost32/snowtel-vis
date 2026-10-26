import { ReactNode } from "react";
import { theme } from "@/lib/theme";

interface SectionHeaderProps {
  title: string;
  description?: string;
  size?: "large" | "medium" | "small";
  titleAdornment?: ReactNode;
}

export default function SectionHeader({ title, description, size = "large", titleAdornment }: SectionHeaderProps) {
  const sizes = {
    large: { titleClass: "text-2xl font-semibold", descClass: "text-sm", spacing: "mb-6" },
    medium: { titleClass: "text-xl font-semibold", descClass: "text-sm", spacing: "mb-5" },
    small: { titleClass: "text-lg font-semibold", descClass: "text-xs", spacing: "mb-4" },
  };

  const { titleClass, descClass, spacing } = sizes[size];

  return (
    <div className={spacing}>
      <h2
        className={`${titleClass} mb-2 font-sans ${size === "large" ? "tracking-tighter" : "tracking-tight"} flex items-center gap-1`}
        style={{ color: theme.black }}
      >
        {title}{titleAdornment}
      </h2>
      {description && (
        <p
          className={`${descClass} max-w-3xl font-mono ${size === "small" ? "leading-relaxed" : "leading-loose"}`}
          style={{ color: theme.gray }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
