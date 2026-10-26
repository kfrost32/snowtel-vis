import { router, Stack } from "expo-router";
import { Form, Host, Picker, Section, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { SNOTEL_STATES, STATE_NAMES } from "@snotel/core/constants";
import { updateAppSettings, useAppSettings, type AppearanceSetting } from "@/lib/app-settings";
import type { Units } from "@snotel/core/units";

const NONE = "";

export default function SettingsScreen() {
  const s = useAppSettings();

  return (
    <>
      <Stack.Title>Settings</Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="checkmark" variant="prominent" accessibilityLabel="Done" onPress={() => router.dismiss()} />
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Units">
            <Picker selection={s.units} onSelectionChange={(units: Units) => updateAppSettings({ units })} modifiers={[pickerStyle("segmented")]}>
              <Text modifiers={[tag("imperial")]}>in · ft · °F</Text>
              <Text modifiers={[tag("metric")]}>cm · m · °C</Text>
            </Picker>
          </Section>

          <Section title="Appearance">
            <Picker
              selection={s.appearance}
              onSelectionChange={(appearance: AppearanceSetting) => updateAppSettings({ appearance })}
              modifiers={[pickerStyle("segmented")]}
            >
              <Text modifiers={[tag("system")]}>System</Text>
              <Text modifiers={[tag("light")]}>Light</Text>
              <Text modifiers={[tag("dark")]}>Dark</Text>
            </Picker>
          </Section>

          <Section title="Home area" footer={<Text>The map opens on this state, and Nearby uses it when location is off.</Text>}>
            <Picker
              label="State"
              selection={s.homeState ?? NONE}
              onSelectionChange={(state: string) => updateAppSettings({ homeState: state || null })}
              modifiers={[pickerStyle("menu")]}
            >
              <Text modifiers={[tag(NONE)]}>None</Text>
              {SNOTEL_STATES.map((state) => (
                <Text key={state} modifiers={[tag(state)]}>{STATE_NAMES[state]}</Text>
              ))}
            </Picker>
          </Section>
        </Form>
      </Host>
    </>
  );
}
