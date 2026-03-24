"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { theme } from "@/lib/theme";

export default function GlobalHeader() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 md:h-12"
      style={{ background: theme.black }}
    >
      <div className="px-4 sm:px-6 h-14 md:h-12 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight hover:opacity-70 transition-opacity duration-150 truncate font-sans"
          style={{ color: theme.white }}
        >
          SNOTEL Explorer
        </Link>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-search"))}
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors duration-150 hover:bg-white/10 cursor-pointer"
          aria-label="Search"
        >
          <Search size={14} style={{ color: "#CCCCCC" }} />
          <kbd
            className="hidden sm:inline font-mono text-[10px] px-1 py-0.5 rounded"
            style={{
              color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
