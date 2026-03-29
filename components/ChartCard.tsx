"use client";

import { ReactNode, useRef, useState, useCallback } from "react";
import { Download } from "lucide-react";
import { theme } from "@/lib/theme";

interface ChartCardProps {
  title: ReactNode;
  description?: string;
  height?: number;
  controls?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  exportable?: boolean;
}

export default function ChartCard({ title, description, height, controls, footer, children, exportable = true }: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);

    try {
      const { toJpeg } = await import("html-to-image");

      const attribution = cardRef.current.querySelector("[data-attribution]") as HTMLElement | null;
      if (attribution) attribution.style.display = "flex";

      const controlsEl = cardRef.current.querySelector("[data-controls]") as HTMLElement | null;
      if (controlsEl) controlsEl.style.display = "none";

      const exportBtn = cardRef.current.querySelector("[data-export-btn]") as HTMLElement | null;
      if (exportBtn) exportBtn.style.display = "none";

      const dataUrl = await toJpeg(cardRef.current, {
        quality: 0.95,
        backgroundColor: "#FFFFFF",
        pixelRatio: 2,
      });

      if (attribution) attribution.style.display = "none";
      if (controlsEl) controlsEl.style.display = "";
      if (exportBtn) exportBtn.style.display = "";

      const link = document.createElement("a");
      link.download = `snotel-chart-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  return (
    <div
      ref={cardRef}
      className="p-4 sm:p-6 rounded-lg border relative"
      style={{ background: theme.white, borderColor: theme.borderGray }}
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className="text-lg mb-2 font-medium flex items-center gap-1"
          style={{ color: theme.black }}
        >
          {title}
        </h3>
        {exportable && (
          <button
            data-export-btn
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 p-1.5 rounded-md transition-colors duration-150 hover:bg-black/[0.05] cursor-pointer"
            style={{ color: theme.gray }}
            aria-label="Export chart as image"
            title="Export as image"
          >
            <Download size={16} />
          </button>
        )}
      </div>
      {description && (
        <p
          className="text-xs mb-4 max-w-2xl font-mono"
          style={{ color: theme.gray, lineHeight: 1.6 }}
        >
          {description}
        </p>
      )}
      {controls && (
        <div className="mb-4" data-controls>
          {controls}
        </div>
      )}
      <div style={height !== undefined ? { height } : undefined}>
        {children}
      </div>
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
      <div
        data-attribution
        className="items-center justify-between pt-3 mt-4 border-t font-mono"
        style={{ display: "none", borderColor: theme.borderGray }}
      >
        <span style={{ color: theme.gray, fontSize: "10px" }}>
          hereandthere.club · SNOTEL Explorer
        </span>
        <span style={{ color: theme.mediumGray, fontSize: "10px" }}>
          Source: USDA NRCS
        </span>
      </div>
    </div>
  );
}
