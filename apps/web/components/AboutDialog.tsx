"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { theme } from "@/lib/theme";
import { useDismiss } from "@/hooks/useDismiss";
import { track } from "@/lib/analytics";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const SOURCES = [
  { name: "USDA NRCS SNOTEL", detail: "Western US snow telemetry", url: "https://www.nrcs.usda.gov/resources/data-and-reports/snow-and-climate-monitoring" },
  { name: "California CDEC", detail: "California snow sensors", url: "https://cdec.water.ca.gov/snow/current/snow/" },
  { name: "BC River Forecast Centre", detail: "British Columbia snow pillows", url: "https://www2.gov.bc.ca/gov/content/environment/air-land-water/water/water-science-data/water-data-tools/snow-survey-data" },
  { name: "National Weather Service", detail: "Snow forecasts", url: "https://www.weather.gov" },
  { name: "OpenSkiMap", detail: "Ski areas", url: "https://openskimap.org" },
];

export default function AboutDialog() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useDismiss(ref, open, close);

  return (
    <>
      <button
        onClick={() => {
          track("open_about");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-label="About the data"
        title="About the data"
        className="flex items-center justify-center size-8 max-md:size-10 rounded-full max-md:bg-[var(--c-hairline)] hover:bg-[var(--c-hover)] active:scale-[0.94] transition cursor-pointer"
      >
        <Info size={16} className="max-md:size-5" style={{ color: theme.gray }} />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 motion-safe:animate-[fadeIn_150ms_ease-out]" style={{ zIndex: 60, background: "rgba(0,0,0,0.4)" }}>
            <div
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-title"
              className="relative w-full max-w-sm p-5 rounded-xl font-sans motion-safe:animate-[scaleIn_150ms_ease-out]"
              style={{ background: theme.white, border: `1px solid ${theme.borderGray}`, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
            >
              <button
                onClick={close}
                aria-label="Close"
                className="absolute top-3 right-3 flex items-center justify-center size-8 rounded-full hover:bg-[var(--c-hover)] transition cursor-pointer"
              >
                <X size={16} style={{ color: theme.gray }} />
              </button>
              <h2 id="about-title" className="text-sm font-semibold tracking-tight" style={{ color: theme.black }}>
                About {SITE_NAME}
              </h2>
              <div className="mt-3 text-xs font-medium" style={{ color: theme.mediumGray }}>Data sources</div>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {SOURCES.map((source) => (
                  <li key={source.name} className="text-sm leading-snug">
                    <a href={source.url} target="_blank" rel="noopener" className="font-medium underline-offset-2 hover:underline" style={{ color: theme.darkGray }}>
                      {source.name}
                    </a>
                    <span className="text-xs" style={{ color: theme.mediumGray }}> · {source.detail}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t text-sm" style={{ borderColor: theme.borderGray, color: theme.gray }}>
                Questions or feedback?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  onClick={() => track("contact_click", { location: "about" })}
                  className="font-medium underline underline-offset-2"
                  style={{ color: theme.darkGray }}
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
