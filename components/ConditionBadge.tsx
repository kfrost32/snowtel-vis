import { getConditionColor, getConditionLabel } from "@/lib/colors";

interface ConditionBadgeProps {
  pctOfNormal: number | null;
  size?: "default" | "small";
}

export default function ConditionBadge({ pctOfNormal, size = "default" }: ConditionBadgeProps) {
  const color = getConditionColor(pctOfNormal);
  const label = getConditionLabel(pctOfNormal);
  const isSmall = size === "small";

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-medium ${isSmall ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}`}
      style={{
        color,
        background: `${color}14`,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}
