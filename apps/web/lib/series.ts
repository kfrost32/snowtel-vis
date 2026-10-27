export function seriesChange(values: (number | null)[], days: number, digits = 1): number | null {
  const latest = values.length - 1;
  if (latest < days) return null;
  const now = values[latest];
  const then = values[latest - days];
  if (now === null || then === null) return null;
  const factor = 10 ** digits;
  return Math.round((now - then) * factor) / factor;
}
