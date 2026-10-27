"use client";

import { SNOTEL_STATES, STATE_NAMES } from "@snotel/core/constants";
import { theme } from "@/lib/theme";
import type { ReactNode } from "react";
import { SidebarSegmented } from "@/components/sidebar";
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

function SettingsGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-sans font-medium" style={{ color: theme.gray }}>{label}</h3>
      {children}
      {hint && <p className="font-sans text-xs" style={{ color: theme.mediumGray }}>{hint}</p>}
    </section>
  );
}

export default function SettingsPanel() {
  const settings = useSettings();
  return (
    <div className="flex flex-col gap-6 px-4 py-5">
      <SettingsGroup label="Units">
        <SidebarSegmented options={UNIT_OPTIONS} value={settings.units} onChange={(units) => updateSettings({ units })} />
      </SettingsGroup>
      <SettingsGroup label="Appearance">
        <SidebarSegmented options={APPEARANCE_OPTIONS} value={settings.appearance} onChange={(appearance) => updateSettings({ appearance })} />
      </SettingsGroup>
      <SettingsGroup label="Home area" hint="The map opens on this state when no state filter is set.">
        <select
          value={settings.homeState ?? ""}
          onChange={(e) => updateSettings({ homeState: e.target.value || null })}
          className="w-full px-2.5 py-2 rounded-lg border font-sans text-sm cursor-pointer"
          style={{ background: theme.white, borderColor: theme.borderGray, color: theme.black }}
        >
          <option value="">None (whole West)</option>
          {SNOTEL_STATES.map((state) => (
            <option key={state} value={state}>
              {STATE_NAMES[state] ?? state}
            </option>
          ))}
        </select>
      </SettingsGroup>
    </div>
  );
}
