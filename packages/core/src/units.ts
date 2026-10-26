export type Units = "imperial" | "metric";

const CM_PER_INCH = 2.54;
const M_PER_FOOT = 0.3048;
const KM_PER_MILE = 1.609344;

let current: Units = "imperial";

export function setUnits(units: Units): void {
  current = units;
}

export function getUnits(): Units {
  return current;
}

export function isMetric(): boolean {
  return current === "metric";
}

export const inchesToCm = (inches: number): number => inches * CM_PER_INCH;
export const feetToMeters = (feet: number): number => feet * M_PER_FOOT;
export const milesToKm = (miles: number): number => miles * KM_PER_MILE;
export const fahrenheitToCelsius = (f: number): number => ((f - 32) * 5) / 9;

export function formatAxisLength(inches: number): string {
  return isMetric() ? `${Math.round(inchesToCm(inches))}cm` : `${inches}″`;
}

export function formatAxisTemp(fahrenheit: number): string {
  return `${Math.round(isMetric() ? fahrenheitToCelsius(fahrenheit) : fahrenheit)}°`;
}

export function lengthUnitLabel(): string {
  return isMetric() ? "cm" : "in";
}
