"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { theme } from "@/lib/theme";

export default function GlobalHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <>
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
          className="flex items-center px-2 py-1 rounded transition-colors duration-150 hover:bg-white/10 cursor-pointer"
          aria-label="Search"
        >
          <Search size={16} style={{ color: "#CCCCCC" }} />
        </button>
      </div>
    </header>
    <div className="h-14 md:h-12" />
    </>
  );
}
