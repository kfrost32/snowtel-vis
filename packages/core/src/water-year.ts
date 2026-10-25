export function getCurrentWaterYear(): number {
  const now = new Date();
  const month = now.getMonth();
  return month >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

export function getWaterYearStart(wy: number): string {
  return `${wy - 1}-10-01`;
}

export function getWaterYearEnd(wy: number): string {
  return `${wy}-09-30`;
}

export function getWaterYearDay(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.getMonth();
  const day = date.getDate();

  const oct1 = month >= 9
    ? new Date(date.getFullYear(), 9, 1)
    : new Date(date.getFullYear() - 1, 9, 1);

  const diff = date.getTime() - oct1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function waterYearDayToDate(wyDay: number, wy: number): Date {
  const oct1 = Date.UTC(wy - 1, 9, 1);
  return new Date(oct1 + (wyDay - 1) * 24 * 60 * 60 * 1000);
}

export function waterYearDayToLabel(wyDay: number, wy: number): string {
  const date = waterYearDayToDate(wyDay, wy);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function isInWaterYear(dateStr: string, wy: number): boolean {
  const start = getWaterYearStart(wy);
  const end = getWaterYearEnd(wy);
  return dateStr >= start && dateStr <= end;
}

const FEB_29_ROW = 152;

export function isLeapWaterYear(wy: number): boolean {
  return (wy % 4 === 0 && wy % 100 !== 0) || wy % 400 === 0;
}

export function calendarRow(dateStr: string): number {
  const month = Number(dateStr.slice(5, 7));
  const day = Number(dateStr.slice(8, 10));
  return Math.round((Date.UTC(month >= 10 ? 1999 : 2000, month - 1, day) - Date.UTC(1999, 9, 1)) / 86400000) + 1;
}

export function calendarRowToWyDay(row: number, wy: number): number {
  return isLeapWaterYear(wy) || row < FEB_29_ROW ? row : row - 1;
}

export function rowsToWaterYear<T>(rows: T[], wy: number): T[] {
  return isLeapWaterYear(wy) ? rows : rows.filter((_, i) => i !== FEB_29_ROW - 1);
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
