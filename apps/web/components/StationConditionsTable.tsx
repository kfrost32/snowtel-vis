import Link from "next/link";
import { getConditionColor } from "@snotel/core/colors";
import { formatDepthChange, formatElevation, formatPctOfNormal, formatSnowDepth, formatSwe } from "@snotel/core/formatting";
import { stationPath } from "@snotel/core/stations";
import type { Station, StationCurrentConditions } from "@snotel/core/types";
import { theme } from "@/lib/theme";

interface StationConditionsTableProps {
  stations: Station[];
  conditions: Map<string, StationCurrentConditions>;
  showState?: boolean;
}

export default function StationConditionsTable({ stations, conditions, showState = false }: StationConditionsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: theme.borderGray, background: theme.white }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs" style={{ color: theme.mediumGray }}>
            <th scope="col" className="px-3 py-2 font-medium">Station</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Elevation</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Depth</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">24h</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">SWE</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">% median</th>
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {stations.map((station) => {
            const current = conditions.get(station.triplet);
            return (
              <tr key={station.triplet} className="border-t" style={{ borderColor: theme.borderGray }}>
                <th scope="row" className="px-3 py-2 text-left font-sans text-sm font-normal">
                  <Link href={stationPath(station.triplet)} className="underline-offset-2 hover:underline">{station.name}</Link>
                  {showState && <span className="ml-1.5 font-mono text-xs" style={{ color: theme.mediumGray }}>{station.state}</span>}
                </th>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right sm:table-cell" style={{ color: theme.gray }}>{formatElevation(station.elevation)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{current?.snowDepth != null ? formatSnowDepth(current.snowDepth) : "—"}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right sm:table-cell">{current?.depthChange1d != null ? formatDepthChange(current.depthChange1d) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{current?.swe != null ? formatSwe(current.swe) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium" style={current?.pctOfNormal != null ? { color: getConditionColor(current.pctOfNormal) } : undefined}>
                  {current?.pctOfNormal != null ? formatPctOfNormal(current.pctOfNormal) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
