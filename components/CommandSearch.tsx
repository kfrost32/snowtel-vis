"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { theme } from "@/lib/theme";
import { getAllStations, urlTriplet } from "@/lib/stations";

interface SearchItem {
  label: string;
  subtitle?: string;
  href: string;
  group: string;
  keywords: string;
}

const stationItems: SearchItem[] = getAllStations().map((s) => ({
  label: s.name,
  subtitle: `${s.state} · ${s.elevation.toLocaleString()}′`,
  href: `/station/${urlTriplet(s.triplet)}`,
  group: "Stations",
  keywords: `${s.name} ${s.state} ${s.triplet}`.toLowerCase(),
}));

function groupItems(items: SearchItem[]): Map<string, SearchItem[]> {
  const map = new Map<string, SearchItem[]>();
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group)!.push(item);
  }
  return map;
}

export default function CommandSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stationItems.slice(0, 50);

    const matches = stationItems.filter((item) => item.keywords.includes(q));
    matches.sort((a, b) => {
      const aStarts = a.keywords.startsWith(q) ? 0 : 1;
      const bStarts = b.keywords.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.label.localeCompare(b.label);
    });
    return matches.slice(0, 20);
  }, [query]);

  const grouped = useMemo(() => groupItems(filtered), [filtered]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      close();
    },
    [router, close]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = () => setOpen(true);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("open-command-search", handleCustomOpen);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("open-command-search", handleCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { selectedRef.current?.scrollIntoView({ block: "nearest" }); }, [selectedIndex]);
  useEffect(() => { close(); }, [pathname, close]);

  const handleDialogKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => (i + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length); }
    else if (e.key === "Enter" && filtered[selectedIndex]) { e.preventDefault(); navigate(filtered[selectedIndex].href); }
  };

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[min(20vh,160px)]"
      style={{ zIndex: 60, background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      onKeyDown={handleDialogKey}
    >
      <div
        className="w-full mx-4 flex flex-col rounded-xl overflow-hidden"
        style={{
          maxWidth: 560,
          maxHeight: 420,
          background: theme.white,
          border: `1px solid ${theme.borderGray}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${theme.borderGray}` }}
        >
          <Search size={16} style={{ color: theme.mediumGray, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stations..."
            className="flex-1 bg-transparent outline-none font-sans text-sm"
            style={{ color: theme.darkGray }}
          />
          <kbd
            className="font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0"
            style={{ color: theme.mediumGray, background: theme.offWhite, border: `1px solid ${theme.borderGray}` }}
          >
            ESC
          </kbd>
        </div>

        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12 font-sans text-sm" style={{ color: theme.mediumGray }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1 font-mono text-[10px] font-medium uppercase tracking-wider" style={{ color: theme.mediumGray }}>
                  {group}
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.href}
                      ref={isSelected ? selectedRef : undefined}
                      className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors duration-75 font-sans text-sm cursor-pointer"
                      style={{ color: theme.darkGray, background: isSelected ? theme.lightGray : "transparent" }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => navigate(item.href)}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.subtitle && (
                        <span className="font-mono text-[11px] ml-3 shrink-0" style={{ color: theme.mediumGray }}>
                          {item.subtitle}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
