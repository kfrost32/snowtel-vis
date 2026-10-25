type Rgba = ["rgba", number, number, number, number];

function parseColor(value: string): Rgba | null {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
    return ["rgba", parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const fn = value.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const [r, g, b, a = 1] = fn[1].split(",").map((p) => parseFloat(p));
    return ["rgba", r, g, b, a];
  }
  return null;
}

function convert(value: unknown): unknown {
  if (typeof value === "string") return parseColor(value) ?? value;
  if (Array.isArray(value)) return value.map(convert);
  return value;
}

export function nativePaint<T extends object | undefined>(paint: T): T {
  if (!paint) return paint;
  return Object.fromEntries(
    Object.entries(paint).map(([key, value]) => [key, key.endsWith("-color") ? convert(value) : value])
  ) as T;
}
