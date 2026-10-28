import { theme } from "@/lib/theme";

interface EnvelopeStat {
  label: string;
  value: string;
  color?: string;
  exportOnly?: boolean;
}

export default function EnvelopeStatGrid({ stats }: { stats: EnvelopeStat[] }) {
  return (
    <div className="@container">
      <div
        className="grid grid-cols-3 gap-px rounded-md border overflow-hidden"
        style={{ borderColor: theme.borderGray, background: theme.borderGray }}
      >
        {stats.map(({ label, value, color, exportOnly }) => (
          <div
            key={label}
            className={`px-2 py-2 text-center ${exportOnly ? "hidden" : ""}`}
            data-export-reveal={exportOnly ? "block" : undefined}
            style={{ background: theme.offWhite }}
          >
            <div className="font-mono text-xs whitespace-nowrap" style={{ color: theme.mediumGray }}>{label}</div>
            <div className="font-mono text-base font-semibold mt-0.5" style={{ color: color ?? theme.black }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
