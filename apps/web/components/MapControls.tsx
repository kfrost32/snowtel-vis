"use client";

import { useState } from "react";
import { theme } from "@/lib/theme";
import { SNOTEL_STATES } from "@snotel/core/constants";
import { SidebarSection, SidebarToggle, SidebarRadioItem, SidebarChip, SidebarSegmented } from "@/components/sidebar";

const METRIC_GROUPS = [
  {
    label: "SWE",
    prefix: "SWE",
    metrics: [
      { key: "WTEQ", label: "Total" },
      { key: "WTEQ_PCT", label: "% of median" },
      { key: "CHANGE_1D", label: "1-day change" },
      { key: "CHANGE_3D", label: "3-day change" },
      { key: "CHANGE_7D", label: "7-day change" },
    ],
  },
  {
    label: "Depth",
    prefix: "Depth",
    metrics: [
      { key: "SNWD", label: "Total" },
      { key: "SNWD_CHANGE_1D", label: "1-day change" },
      { key: "SNWD_CHANGE_3D", label: "3-day change" },
      { key: "SNWD_CHANGE_7D", label: "7-day change" },
    ],
  },
  {
    label: "Forecast",
    prefix: "Forecast",
    metrics: [
      { key: "FORECAST_3D", label: "Next 3 days" },
      { key: "FORECAST_7D", label: "Next 7 days" },
    ],
  },
  {
    label: "Other",
    metrics: [
      { key: "PREC", label: "Season precip" },
      { key: "TAVG", label: "Temperature" },
    ],
  },
] as const;

export function metricButtonLabel(metric: string): string {
  for (const group of METRIC_GROUPS) {
    const item = group.metrics.find((m) => m.key === metric);
    if (item) return "prefix" in group ? `${group.prefix} · ${item.label}` : item.label;
  }
  return metric;
}

export interface MapControlsProps {
  metric: string;
  onMetricChange: (metric: string) => void;
  showStations: boolean;
  onShowStationsChange: (v: boolean) => void;
  showHuc2: boolean;
  onShowHuc2Change: (v: boolean) => void;
  showHuc4: boolean;
  onShowHuc4Change: (v: boolean) => void;
  showSpots: boolean;
  onShowSpotsChange: (v: boolean) => void;
  activeOnly: boolean;
  onActiveOnlyChange: (v: boolean) => void;
  selectedStates: Set<string>;
  onStatesChange: (states: Set<string>) => void;
  elevMin: string;
  elevMax: string;
  onElevMinChange: (val: string) => void;
  onElevMaxChange: (val: string) => void;
}

export default function MapControls({
  metric,
  onMetricChange,
  showStations,
  onShowStationsChange,
  showHuc2,
  onShowHuc2Change,
  showHuc4,
  onShowHuc4Change,
  showSpots,
  onShowSpotsChange,
  activeOnly,
  onActiveOnlyChange,
  selectedStates,
  onStatesChange,
  elevMin,
  elevMax,
  onElevMinChange,
  onElevMaxChange,
}: MapControlsProps) {
  const [elevMinFocused, setElevMinFocused] = useState(false);
  const [elevMaxFocused, setElevMaxFocused] = useState(false);
  const [clearHovered, setClearHovered] = useState(false);
  const activeGroup = METRIC_GROUPS.find((g) => g.metrics.some((m) => m.key === metric)) ?? METRIC_GROUPS[0];

  const toggleState = (state: string) => {
    const next = new Set(selectedStates);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    onStatesChange(next);
  };

  return (
    <div className="flex flex-col">
      <SidebarSection label="Metric">
        <div className="mb-2">
          <SidebarSegmented
            options={METRIC_GROUPS.map((group) => ({ value: group.label, label: group.label }))}
            value={activeGroup.label}
            onChange={(label) => onMetricChange(METRIC_GROUPS.find((group) => group.label === label)!.metrics[0].key)}
          />
        </div>
        <div className="flex flex-col">
          {activeGroup.metrics.map((m) => (
            <SidebarRadioItem key={m.key} label={m.label} active={metric === m.key} onClick={() => onMetricChange(m.key)} />
          ))}
        </div>
      </SidebarSection>

      <SidebarSection label="Layers">
        <div className="flex flex-col gap-3">
          <SidebarToggle label="Stations" description="Individual sites" checked={showStations} onChange={onShowStationsChange} />
          <SidebarToggle label="Active stations only" description="Has SWE data this season" checked={activeOnly} onChange={onActiveOnlyChange} />
          <SidebarToggle label="Regions" description="Major river basins (HUC-2)" checked={showHuc2} onChange={onShowHuc2Change} />
          <SidebarToggle label="Sub-regions" description="Smaller basins (HUC-4)" checked={showHuc4} onChange={onShowHuc4Change} />
          <SidebarToggle label="Ski areas" description="Resorts and backcountry spots" checked={showSpots} onChange={onShowSpotsChange} />
        </div>
      </SidebarSection>

      <SidebarSection
        label="States"
        defaultOpen={selectedStates.size > 0}
        trailing={
          selectedStates.size > 0 ? (
            <button
              onClick={() => onStatesChange(new Set())}
              className="text-xs font-sans cursor-pointer transition-colors duration-150"
              style={{ color: clearHovered ? theme.gray : theme.mediumGray }}
              onMouseEnter={() => setClearHovered(true)}
              onMouseLeave={() => setClearHovered(false)}
            >
              Clear
            </button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-1">
          {SNOTEL_STATES.map((state) => (
            <SidebarChip
              key={state}
              label={state}
              active={selectedStates.has(state)}
              onClick={() => toggleState(state)}
            />
          ))}
        </div>
      </SidebarSection>

      <SidebarSection label="Elevation (ft)" defaultOpen={Boolean(elevMin || elevMax)}>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            value={elevMin}
            onChange={(e) => onElevMinChange(e.target.value)}
            aria-label="Minimum elevation (feet)"
            className="flex-1 w-full px-2.5 py-2 md:py-1.5 text-sm md:text-xs font-mono rounded-lg border outline-none transition-all duration-150"
            style={{ borderColor: elevMinFocused ? theme.mediumGray : theme.borderGray, color: theme.black, background: theme.white }}
            onFocus={() => setElevMinFocused(true)}
            onBlur={() => setElevMinFocused(false)}
          />
          <span className="text-xs md:text-xs font-sans flex-shrink-0" style={{ color: theme.borderGray }}>to</span>
          <input
            type="number"
            placeholder="Max"
            value={elevMax}
            onChange={(e) => onElevMaxChange(e.target.value)}
            aria-label="Maximum elevation (feet)"
            className="flex-1 w-full px-2.5 py-2 md:py-1.5 text-sm md:text-xs font-mono rounded-lg border outline-none transition-all duration-150"
            style={{ borderColor: elevMaxFocused ? theme.mediumGray : theme.borderGray, color: theme.black, background: theme.white }}
            onFocus={() => setElevMaxFocused(true)}
            onBlur={() => setElevMaxFocused(false)}
          />
        </div>
      </SidebarSection>
    </div>
  );
}
