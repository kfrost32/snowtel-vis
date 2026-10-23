import type { CSSProperties } from "react";
import { theme } from "@/lib/theme";
import { titleColorVars } from "@/components/ChartTitle";
import { formatReadingDate } from "@/lib/formatting";

interface EnvelopeCardTitleProps {
  name: string;
  meta: string[];
  asOf: string | null;
}

export default function EnvelopeCardTitle({ name, meta, asOf }: EnvelopeCardTitleProps) {
  return (
    <span className="block min-w-0">
      <span className="flex items-baseline gap-x-2 flex-wrap max-md:hidden" data-export-reveal="flex">
        <span className="font-semibold" style={{ color: theme.black }}>{name}</span>
        <span className="font-mono text-[11px] font-normal" style={{ color: theme.gray }}>{meta.join(" · ")}</span>
      </span>
      <span className="block md:mt-0.5" style={{ ...titleColorVars, "--muted": theme.mediumGray } as CSSProperties}>
        <span className="text-[var(--title)] max-md:block max-md:font-medium max-md:text-lg md:text-[13px] md:font-normal md:text-[var(--subtle)]">
          Snow water equivalent
        </span>
        {asOf && (
          <span className="font-normal text-[var(--muted)] max-md:block max-md:mt-1 max-md:font-mono max-md:text-xs max-md:text-[var(--subtle)] md:text-[13px]">
            <span className="max-md:hidden"> · </span>
            {formatReadingDate(asOf)}
          </span>
        )}
      </span>
    </span>
  );
}
