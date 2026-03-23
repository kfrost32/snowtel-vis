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
  viewMode: "stations" | "basins";
  onViewModeChange: (mode: "stations" | "basins") => void;
  basinLevel: 2 | 4;
  onBasinLevelChange: (level: 2 | 4) => void;
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

export default function MapControls({
  metric,
  onMetricChange,
  viewMode,
  onViewModeChange,
  basinLevel,
  onBasinLevelChange,
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
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: theme.lightGray }}
        >
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

      <div
        className="mx-4 border-t"
        style={{ borderColor: theme.borderGray }}
      />

      <div className="px-4 py-3">
        <SectionLabel>View</SectionLabel>
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: theme.lightGray }}
        >
          {(["stations", "basins"] as const).map((mode) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className="flex-1 px-2 py-1.5 text-[11px] font-sans font-medium rounded-md transition-all duration-150 cursor-pointer capitalize"
                style={{
                  background: active ? theme.white : "transparent",
                  color: active ? theme.black : theme.mediumGray,
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>
        <div
          className="overflow-hidden transition-all duration-200"
          style={{
            maxHeight: viewMode === "basins" ? 40 : 0,
            opacity: viewMode === "basins" ? 1 : 0,
            marginTop: viewMode === "basins" ? 8 : 0,
          }}
        >
          <div className="flex gap-1.5">
            {([2, 4] as const).map((level) => {
              const active = basinLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => onBasinLevelChange(level)}
                  className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-md transition-all duration-150 cursor-pointer"
                  style={{
                    background: active ? theme.darkGray : theme.lightGray,
                    color: active ? theme.white : theme.mediumGray,
                  }}
                >
                  HUC-{level}
                </button>
              );
            })}
            <span
              className="text-[10px] font-sans self-center ml-0.5"
              style={{ color: theme.mediumGray }}
            >
              {basinLevel === 2 ? "Major Basins" : "Sub-Basins"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="mx-4 border-t"
        style={{ borderColor: theme.borderGray }}
      />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Region</SectionLabel>
          {selectedStates.size > 0 && (
            <button
              onClick={() => onStatesChange(new Set())}
              className="text-[10px] font-sans cursor-pointer transition-colors duration-150"
              style={{ color: theme.mediumGray }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = theme.gray)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = theme.mediumGray)
              }
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

      <div
        className="mx-4 border-t"
        style={{ borderColor: theme.borderGray }}
      />

      <div className="px-4 py-3">
        <SectionLabel>Elevation (ft)</SectionLabel>
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              type="number"
              placeholder="Min"
              value={elevMin}
              onChange={(e) => onElevMinChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border outline-none transition-all duration-150"
              style={{
                borderColor: theme.borderGray,
                color: theme.black,
                background: theme.white,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = theme.mediumGray)
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = theme.borderGray)
              }
            />
          </div>
          <span
            className="text-[10px] font-sans flex-shrink-0"
            style={{ color: theme.borderGray }}
          >
            to
          </span>
          <div className="flex-1 relative">
            <input
              type="number"
              placeholder="Max"
              value={elevMax}
              onChange={(e) => onElevMaxChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border outline-none transition-all duration-150"
              style={{
                borderColor: theme.borderGray,
                color: theme.black,
                background: theme.white,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = theme.mediumGray)
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = theme.borderGray)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
