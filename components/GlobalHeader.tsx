"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search } from "lucide-react";
import { theme } from "@/lib/theme";

const sections = [
  { href: "/", label: "Dashboard", shortLabel: "Dashboard" },
  { href: "/map", label: "Map", shortLabel: "Map" },
  { href: "/basins", label: "Basins", shortLabel: "Basins" },
  { href: "/rankings", label: "Rankings", shortLabel: "Rankings" },
  { href: "/compare", label: "Compare", shortLabel: "Compare" },
];

export default function GlobalHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

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

        <div className="hidden md:flex items-center gap-1">
          <nav className="flex items-center gap-4">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className={`text-xs px-3 py-1.5 rounded transition-colors duration-150 font-sans ${isActive(section.href) ? "font-semibold" : "font-normal"}`}
                style={{
                  color: isActive(section.href) ? theme.white : "#CCCCCC",
                  background: isActive(section.href) ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                {section.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-search"))}
            className="ml-2 flex items-center gap-1.5 px-2 py-1 rounded transition-colors duration-150 hover:bg-white/10 cursor-pointer"
            aria-label="Search"
          >
            <Search size={14} style={{ color: "#CCCCCC" }} />
            <kbd
              className="font-mono text-[10px] px-1 py-0.5 rounded"
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

        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-search"))}
            className="p-2 rounded transition-colors duration-150 hover:opacity-70 cursor-pointer"
            aria-label="Search"
            style={{ color: theme.white }}
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded transition-colors duration-150 hover:opacity-70"
            aria-label="Toggle menu"
            style={{ color: theme.white }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden" style={{ background: theme.black }}>
          <nav className="py-2">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-center px-5 py-4 font-sans transition-colors duration-150"
                style={{
                  color: isActive(section.href) ? theme.white : "rgba(255,255,255,0.7)",
                  fontWeight: isActive(section.href) ? 700 : 600,
                  fontSize: "15px",
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  background: isActive(section.href) ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
