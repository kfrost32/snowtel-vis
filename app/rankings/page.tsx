"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { theme, snowColors } from "@/lib/theme";
import { formatSwe, formatPctOfNormal, formatElevation, formatSnowDepth, formatChange } from "@/lib/formatting";
import { getConditionColor } from "@/lib/colors";
import { SNOTEL_STATES, STATE_NAMES } from "@/lib/constants";
import { urlTriplet } from "@/lib/stations";
import { useStationList } from "@/hooks/useStationList";
import { median } from "@/lib/basins";
import type { StationCurrentConditions } from "@/lib/types";
import SortableTable from "@/components/SortableTable";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Column } from "@/components/SortableTable";
import ConditionBadge from "@/components/ConditionBadge";

const columns: Column<StationCurrentConditions>[] = [
  {
    key: "rank",
    label: "#",
    className: "w-10",
    defaultSortDir: "desc",
    getValue: (item) => item.pctOfNormal ?? -1,
    render: (_item, i) => (
      <span className="font-mono text-xs" style={{ color: theme.mediumGray }}>
        {(i ?? 0) + 1}
      </span>
    ),
  },
  {
    key: "name",
    label: "Station",
    defaultSortDir: "asc",
    className: "min-w-[160px]",
    getValue: (item) => item.name,
    render: (item) => (
      <div className="py-2.5">
        <div className="font-sans text-sm font-medium" style={{ color: theme.darkGray }}>
          {item.name}
        </div>
        <div className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
          {STATE_NAMES[item.state] || item.state}
        </div>
      </div>
    ),
  },
  {
    key: "elevation",
    label: "Elev",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.elevation,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatElevation(item.elevation)}
      </span>
    ),
  },
  {
    key: "swe",
    label: "SWE",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.swe ?? -1,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatSwe(item.swe)}
      </span>
    ),
  },
  {
    key: "pctOfNormal",
    label: "% Normal",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.pctOfNormal ?? -1,
    render: (item) => (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
          {formatPctOfNormal(item.pctOfNormal)}
        </span>
        <ConditionBadge pctOfNormal={item.pctOfNormal} size="small" />
      </div>
    ),
  },
  {
    key: "snowDepth",
    label: "Depth",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.snowDepth ?? -1,
    render: (item) => (
      <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
        {formatSnowDepth(item.snowDepth)}
      </span>
    ),
  },
  {
    key: "sweChange7d",
    label: "7d Change",
    align: "right",
    defaultSortDir: "desc",
    getValue: (item) => item.sweChange7d ?? 0,
    render: (item) => {
      const val = item.sweChange7d;
      const color =
        val === null ? theme.mediumGray : val > 0 ? snowColors.above : val < 0 ? snowColors.wellBelow : theme.darkGray;
      return (
        <span className="font-mono text-sm" style={{ color }}>
          {formatChange(val)}
        </span>
      );
    },
  },
];

function StateFilter({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (states: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-sm transition-colors hover:bg-black/[0.02] cursor-pointer"
        style={{ borderColor: theme.borderGray, color: selected.size > 0 ? theme.black : theme.gray }}
      >
        {selected.size > 0 ? `${selected.size} state${selected.size > 1 ? "s" : ""}` : "All states"}
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-20 rounded-lg border shadow-lg p-2 min-w-[180px] max-h-[320px] overflow-y-auto"
            style={{ background: theme.white, borderColor: theme.borderGray }}
          >
            {SNOTEL_STATES.map((st) => (
              <label
                key={st}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-black/[0.02]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(st)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(st)) next.delete(st);
                    else next.add(st);
                    onChange(next);
                  }}
                  className="rounded accent-current"
                  style={{ accentColor: theme.black }}
                />
                <span className="font-mono text-sm" style={{ color: theme.darkGray }}>
                  {STATE_NAMES[st]} ({st})
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RankingsPage() {
  const { stations, loading } = useStationList();
  const [search, setSearch] = useState("");
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = stations;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (selectedStates.size > 0) {
      result = result.filter((s) => selectedStates.has(s.state));
    }
    return result;
  }, [stations, search, selectedStates]);

  const medianPct = useMemo(() => {
    const values = filtered.filter((s) => s.pctOfNormal !== null).map((s) => s.pctOfNormal!);
    return values.length > 0 ? median(values) : null;
  }, [filtered]);

  const hasFilters = search !== "" || selectedStates.size > 0;

  if (loading) {
    return <LoadingSpinner message="Loading stations..." fullScreen />;
  }

  return (
    <div style={{ background: theme.white }}>
      <div className="px-4 sm:px-6 pt-10 pb-6">
        <h1
          className="text-3xl sm:text-4xl font-semibold tracking-tighter font-sans mb-2"
          style={{ color: theme.black }}
        >
          Station Rankings
        </h1>
        <p className="font-mono text-sm max-w-2xl" style={{ color: theme.gray, lineHeight: 1.7 }}>
          All SNOTEL stations ranked by current conditions. Filter by name or state to narrow results.
        </p>
      </div>

      <div className="px-4 sm:px-6 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: theme.mediumGray }}
            />
            <input
              type="text"
              placeholder="Search stations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border font-mono text-sm outline-none transition-colors focus:border-black/20"
              style={{ borderColor: theme.borderGray, color: theme.darkGray }}
            />
          </div>
          <StateFilter selected={selectedStates} onChange={setSelectedStates} />
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedStates(new Set());
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg font-mono text-sm transition-colors hover:bg-black/[0.02] cursor-pointer"
              style={{ color: theme.gray }}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        className="px-4 sm:px-6 py-3 flex items-center gap-4 border-t border-b"
        style={{ borderColor: theme.borderGray, background: theme.offWhite }}
      >
        <span className="font-mono text-xs" style={{ color: theme.gray }}>
          <strong style={{ color: theme.darkGray }}>{filtered.length}</strong> stations
        </span>
        {medianPct !== null && (
          <span className="font-mono text-xs" style={{ color: theme.gray }}>
            Median:{" "}
            <strong style={{ color: getConditionColor(medianPct) }}>
              {formatPctOfNormal(medianPct)}
            </strong>{" "}
            of normal
          </span>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-12">
        <SortableTable
          data={filtered}
          columns={columns}
          getHref={(item) => `/station/${urlTriplet(item.triplet)}`}
          getKey={(item) => item.triplet}
          defaultSortKey="pctOfNormal"
          defaultSortDir="desc"
        />
      </div>
    </div>
  );
}
