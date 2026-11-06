"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { theme } from "@/lib/theme";

const NAV_LINKS = [
  { href: "/", label: "Map" },
  { href: "/stations", label: "Stations" },
  { href: "/basins", label: "Basins" },
];

export default function GlobalHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <>
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 md:h-12"
      style={{ background: theme.header, boxShadow: "0 1px 0 var(--c-hairline)" }}
    >
      <div className="px-4 sm:px-6 h-14 md:h-12 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight hover:opacity-70 transition-opacity duration-150 truncate font-sans"
          style={{ color: theme.onAccent }}
        >
          snotel.fyi
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1 font-sans text-sm">
            {NAV_LINKS.map(({ href, label }) => {
              const active = href !== "/" && pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`px-2 py-1 rounded transition-colors duration-150 hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${active ? "font-medium bg-white/10" : ""}`}
                  style={{ color: active ? theme.onAccent : "#CCCCCC" }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-search"))}
            className="flex items-center px-2 py-1 rounded transition-colors duration-150 hover:bg-white/10 cursor-pointer"
            aria-label="Search"
          >
            <Search size={16} style={{ color: "#CCCCCC" }} />
          </button>
        </div>
      </div>
    </header>
    <div className="h-14 md:h-12" />
    </>
  );
}
