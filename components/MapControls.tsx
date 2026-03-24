"use client";

import { theme } from "@/lib/theme";
import { SNOTEL_STATES } from "@/lib/constants";

const METRICS = [
  { key: "WTEQ", label: "SWE" },
  { key: "SNWD", label: "Depth" },
  { key: "PREC", label: "Precip" },
  { key: "TAVG", label: "Temp" },
] as const;

interface MapControlsProps {
  metric: string;
  onMetricChange: (metric: string) => void;
  showStations: boolean;
  onShowStationsChange: (v: boolean) => void;
  showHuc2: boolean;
  onShowHuc2Change: (v: boolean) => void;
  showHuc4: boolean;
  onShowHuc4Change: (v: boolean) => void;
  activeOnly: boolean;
  onActiveOnlyChange: (v: boolean) => void;
  selectedStates: Set<string>;
  onStatesChange: (states: Set<string>) => void;
  elevMin: string;
  elevMax: string;
  onElevMinChange: (val: string) => void;
  onElevMaxChange: (val: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-semibold uppercase tracking-wider mb-2 font-sans select-none"
      style={{ color: theme.mediumGray }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 border-t" style={{ borderColor: theme.borderGray }} />;
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
  activeOnly,
  onActiveOnlyChange,
  selectedStates,
  onStatesChange,
  elevMin,
  elevMax,
  onElevMinChange,
  onElevMaxChange,
}: MapControlsProps) {
  const toggleState = (state: string) => {
    const next = new Set(selectedStates);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    onStatesChange(next);
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 py-3">
        <SectionLabel>Metric</SectionLabel>
        <div className="flex rounded-lg p-0.5" style={{ background: theme.lightGray }}>
          {METRICS.map((m) => {
            const active = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => onMetricChange(m.key)}
                className="flex-1 px-2 py-1.5 text-[11px] font-sans font-medium rounded-md transition-all duration-150 cursor-pointer"
                style={{
                  background: active ? theme.white : "transparent",
                  color: active ? theme.black : theme.mediumGray,
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <SectionLabel>Layers</SectionLabel>
        <div className="flex flex-col gap-3">
          {([
            { label: "Stations", sub: "Individual sites", value: showStations, onChange: onShowStationsChange },
            { label: "HUC-4 Basins", sub: "Sub-basin fill", value: showHuc4, onChange: onShowHuc4Change },
            { label: "HUC-2 Basins", sub: "Major region outlines", value: showHuc2, onChange: onShowHuc2Change },
          ] as const).map(({ label, sub, value, onChange }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <div>
                <div className="font-sans text-xs font-medium" style={{ color: theme.darkGray }}>{label}</div>
                <div className="font-mono text-[10px]" style={{ color: theme.mediumGray }}>{sub}</div>
              </div>
              <button
                role="switch"
                aria-checked={value}
                onClick={() => onChange(!value)}
                className="relative w-8 h-4 rounded-full transition-colors duration-150 cursor-pointer shrink-0"
                style={{ background: value ? theme.black : theme.borderGray }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 rounded-full transition-transform duration-150"
                  style={{ background: theme.white, transform: value ? "translateX(18px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <SectionLabel>Filters</SectionLabel>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-sans text-xs font-medium" style={{ color: theme.darkGray }}>
            Active stations only
            <span className="block font-mono text-[10px] font-normal" style={{ color: theme.mediumGray }}>
              Has SWE data this season
            </span>
          </span>
          <button
            role="switch"
            aria-checked={activeOnly}
            onClick={() => onActiveOnlyChange(!activeOnly)}
            className="relative w-8 h-4 rounded-full transition-colors duration-150 cursor-pointer shrink-0"
            style={{ background: activeOnly ? theme.black : theme.borderGray }}
          >
            <span
              className="absolute top-0.5 w-3 h-3 rounded-full transition-transform duration-150"
              style={{ background: theme.white, transform: activeOnly ? "translateX(18px)" : "translateX(2px)" }}
            />
          </button>
        </label>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Region</SectionLabel>
          {selectedStates.size > 0 && (
            <button
              onClick={() => onStatesChange(new Set())}
              className="text-[10px] font-sans cursor-pointer transition-colors duration-150"
              style={{ color: theme.mediumGray }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.gray)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.mediumGray)}
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {SNOTEL_STATES.map((state) => {
            const active = selectedStates.has(state);
            return (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className="px-2 py-1 text-[11px] font-mono font-medium rounded-md transition-all duration-150 cursor-pointer"
                style={{
                  background: active ? theme.black : theme.lightGray,
                  color: active ? theme.white : theme.mediumGray,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = theme.borderGray;
                    e.currentTarget.style.color = theme.gray;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = theme.lightGray;
                    e.currentTarget.style.color = theme.mediumGray;
                  }
                }}
              >
                {state}
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <SectionLabel>Elevation (ft)</SectionLabel>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <input
              type="number"
              placeholder="Min"
              value={elevMin}
              onChange={(e) => onElevMinChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border outline-none transition-all duration-150"
              style={{ borderColor: theme.borderGray, color: theme.black, background: theme.white }}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.mediumGray)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.borderGray)}
            />
          </div>
          <span className="text-[10px] font-sans flex-shrink-0" style={{ color: theme.borderGray }}>to</span>
          <div className="flex-1">
            <input
              type="number"
              placeholder="Max"
              value={elevMax}
              onChange={(e) => onElevMaxChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border outline-none transition-all duration-150"
              style={{ borderColor: theme.borderGray, color: theme.black, background: theme.white }}
              onFocus={(e) => (e.currentTarget.style.borderColor = theme.mediumGray)}
              onBlur={(e) => (e.currentTarget.style.borderColor = theme.borderGray)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
