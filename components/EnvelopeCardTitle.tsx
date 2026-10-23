import { theme } from "@/lib/theme";
import { formatReadingDate } from "@/lib/formatting";

interface EnvelopeCardTitleProps {
  name: string;
  meta: string[];
  asOf: string | null;
}

export default function EnvelopeCardTitle({ name, meta, asOf }: EnvelopeCardTitleProps) {
  return (
    <span className="block min-w-0">
      <span className="flex items-baseline gap-x-2 flex-wrap">
        <span className="font-semibold" style={{ color: theme.black }}>{name}</span>
        <span className="font-mono text-[11px] font-normal" style={{ color: theme.gray }}>{meta.join(" · ")}</span>
      </span>
      <span className="block text-[13px] font-normal mt-0.5" style={{ color: theme.gray }}>
        Snow water equivalent{asOf && <span style={{ color: theme.mediumGray }}> · {formatReadingDate(asOf)}</span>}
      </span>
    </span>
  );
}
