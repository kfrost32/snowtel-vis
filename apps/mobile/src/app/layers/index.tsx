import { router, Stack } from "expo-router";
import { Button, Form, Host, HStack, Image, Picker, Section, Spacer, Text, Toggle } from "@expo/ui/swift-ui";
import { foregroundStyle, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { SNOTEL_STATES, STATE_NAMES } from "@snotel/core/constants";
import { formatElevation } from "@snotel/core/formatting";
import { activeFilterCount, resetMapFilters, updateMapSettings, useMapSettings } from "@/lib/map-settings";

const ELEVATIONS = [5000, 6000, 7000, 8000, 9000, 10000, 11000];
const ANY = 0;

export default function LayersScreen() {
  const s = useMapSettings();

  const toggleState = (state: string) =>
    updateMapSettings({ states: s.states.includes(state) ? s.states.filter((x) => x !== state) : [...s.states, state] });

  return (
    <>
      <Stack.Title>Map Options</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" accessibilityLabel="Done" onPress={() => router.dismiss()} />
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Layers">
            <Toggle label="Stations" systemImage="circle.circle" isOn={s.showStations} onIsOnChange={(v) => updateMapSettings({ showStations: v })} />
            <Toggle label="Regions" systemImage="square.split.2x2" isOn={s.showRegions} onIsOnChange={(v) => updateMapSettings({ showRegions: v })} />
            <Toggle label="Sub-regions" systemImage="square.grid.3x3" isOn={s.showSubregions} onIsOnChange={(v) => updateMapSettings({ showSubregions: v })} />
            <Toggle label="Ski areas" systemImage="figure.skiing.downhill" isOn={s.showSpots} onIsOnChange={(v) => updateMapSettings({ showSpots: v })} />
          </Section>

          <Section title="Stations" footer={<Text>Inactive stations have no SWE reading this season.</Text>}>
            <Toggle label="Active stations only" isOn={s.activeOnly} onIsOnChange={(v) => updateMapSettings({ activeOnly: v })} />
            <Picker
              label="Minimum elevation"
              selection={s.elevMin ?? ANY}
              onSelectionChange={(v: number) => updateMapSettings({ elevMin: v === ANY ? null : v })}
              modifiers={[pickerStyle("menu")]}
            >
              <Text modifiers={[tag(ANY)]}>Any</Text>
              {ELEVATIONS.map((e) => (
                <Text key={e} modifiers={[tag(e)]}>{formatElevation(e)}</Text>
              ))}
            </Picker>
            <Picker
              label="Maximum elevation"
              selection={s.elevMax ?? ANY}
              onSelectionChange={(v: number) => updateMapSettings({ elevMax: v === ANY ? null : v })}
              modifiers={[pickerStyle("menu")]}
            >
              <Text modifiers={[tag(ANY)]}>Any</Text>
              {ELEVATIONS.map((e) => (
                <Text key={e} modifiers={[tag(e)]}>{formatElevation(e)}</Text>
              ))}
            </Picker>
          </Section>

          <Section title="States" footer={<Text>Select none to show every state.</Text>}>
            {SNOTEL_STATES.map((state) => (
              <Button key={state} onPress={() => toggleState(state)}>
                <HStack>
                  <Text modifiers={[foregroundStyle({ type: "hierarchical", style: "primary" })]}>{STATE_NAMES[state]}</Text>
                  <Spacer />
                  {s.states.includes(state) && <Image systemName="checkmark" />}
                </HStack>
              </Button>
            ))}
          </Section>

          {activeFilterCount(s) > 0 && (
            <Section>
              <Button label="Reset Filters" role="destructive" onPress={resetMapFilters} />
            </Section>
          )}
        </Form>
      </Host>
    </>
  );
}
