import { theme } from "@/lib/theme";
import { formatReadingDateShort } from "@snotel/core/formatting";

interface EnvelopeCardTitleProps {
  name: string;
  meta: string[];
  asOf: string | null;
}

export default function EnvelopeCardTitle({ name, meta, asOf }: EnvelopeCardTitleProps) {
  return (
    <span className="flex flex-col min-w-0">
      <span className="hidden items-baseline gap-x-2 flex-wrap" data-export-reveal="flex">
        <span className="font-semibold" style={{ color: theme.black }}>{name}</span>
        <span className="font-mono text-xs font-normal" style={{ color: theme.gray }}>{meta.join(" · ")}</span>
      </span>
      <span className="flex items-baseline gap-x-2 flex-wrap">
        <span>Snow water equivalent</span>
        {asOf && (
          <span className="font-mono text-xs font-normal" style={{ color: theme.mediumGray }}>
            as of {formatReadingDateShort(asOf)}
          </span>
        )}
      </span>
    </span>
  );
}
