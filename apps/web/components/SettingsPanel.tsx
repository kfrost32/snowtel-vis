"use client";

import { SNOTEL_STATES, STATE_NAMES } from "@snotel/core/constants";
import { theme } from "@/lib/theme";
import { SidebarSection, SidebarSegmented } from "@/components/sidebar";
import { updateSettings, useSettings, type Appearance } from "@/lib/settings";
import type { Units } from "@snotel/core/units";

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: "imperial", label: "in · ft · °F" },
  { value: "metric", label: "cm · m · °C" },
];

const APPEARANCE_OPTIONS: { value: Appearance; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsPanel() {
  const settings = useSettings();
  return (
    <div className="flex flex-col">
      <SidebarSection label="Units">
        <SidebarSegmented options={UNIT_OPTIONS} value={settings.units} onChange={(units) => updateSettings({ units })} />
      </SidebarSection>
      <SidebarSection label="Appearance">
        <SidebarSegmented options={APPEARANCE_OPTIONS} value={settings.appearance} onChange={(appearance) => updateSettings({ appearance })} />
      </SidebarSection>
      <SidebarSection label="Home area">
        <select
          value={settings.homeState ?? ""}
          onChange={(e) => updateSettings({ homeState: e.target.value || null })}
          className="w-full px-2.5 py-1.5 rounded-md border font-sans text-[13px] cursor-pointer"
          style={{ background: theme.white, borderColor: theme.borderGray, color: theme.black }}
        >
          <option value="">None (whole West)</option>
          {SNOTEL_STATES.map((state) => (
            <option key={state} value={state}>
              {STATE_NAMES[state] ?? state}
            </option>
          ))}
        </select>
        <p className="font-sans text-xs mt-2" style={{ color: theme.mediumGray }}>
          The map opens on this state when no state filter is set.
        </p>
      </SidebarSection>
    </div>
  );
}
