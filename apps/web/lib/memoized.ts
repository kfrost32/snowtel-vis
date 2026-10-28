const MEMO_MS = 10 * 60 * 1000;

export function memoized<T>(load: () => Promise<T>): () => Promise<T> {
  let entry: { value: Promise<T>; at: number } | null = null;
  return () => {
    if (entry && Date.now() - entry.at < MEMO_MS) return entry.value;
    const current = { value: load(), at: Date.now() };
    entry = current;
    current.value.catch(() => {
      if (entry === current) entry = null;
    });
    return current.value;
  };
}
