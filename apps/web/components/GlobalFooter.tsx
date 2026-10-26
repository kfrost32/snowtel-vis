import Link from "next/link";
import { theme } from "@/lib/theme";

export default function GlobalFooter() {
  return (
    <footer
      className="border-t"
      style={{
        background: theme.white,
        borderColor: theme.borderGray,
      }}
    >
      <div className="px-4 sm:px-6 py-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: theme.gray, letterSpacing: "0.1em" }}
            >
              Explore
            </div>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/map"
                  className="text-xs font-mono hover:underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: theme.darkGray }}
                >
                  Interactive Map
                </Link>
              </li>
<li>
                <Link
                  href="/compare"
                  className="text-xs font-mono hover:underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: theme.darkGray }}
                >
                  Compare Stations
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: theme.gray, letterSpacing: "0.1em" }}
            >
              Data Sources
            </div>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://www.nrcs.usda.gov/wps/portal/wcc/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono hover:underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: theme.darkGray }}
                >
                  NRCS National Water &amp; Climate Center
                </a>
              </li>
              <li>
                <a
                  href="https://wcc.sc.egov.usda.gov/reportGenerator/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono hover:underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{ color: theme.darkGray }}
                >
                  SNOTEL Report Generator
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: theme.gray, letterSpacing: "0.1em" }}
            >
              About
            </div>
            <p
              className="text-xs font-mono leading-relaxed mb-3"
              style={{ color: theme.darkGray, lineHeight: 1.7 }}
            >
              A modern visualization of USDA SNOTEL snowpack monitoring data. Built by{" "}
              <a
                href="https://kylefrost.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-70 transition-opacity"
                style={{ color: theme.black, textUnderlineOffset: "3px" }}
              >
                Kyle Frost
              </a>
              .
            </p>
          </div>
        </div>

        <div
          className="pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          style={{ borderColor: theme.borderGray }}
        >
          <span className="text-xs font-mono" style={{ color: theme.mediumGray }}>
            SNOTEL Explorer
          </span>
          <span className="text-xs font-mono" style={{ color: theme.mediumGray }}>
            Data: USDA NRCS
          </span>
        </div>
      </div>
    </footer>
  );
}
