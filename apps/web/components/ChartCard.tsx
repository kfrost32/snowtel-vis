"use client";

import { ReactNode, useRef, useState, useCallback } from "react";
import { Check, Copy, Download, Share } from "lucide-react";
import { theme } from "@/lib/theme";
import OverflowMenu, { type OverflowMenuItem } from "@/components/OverflowMenu";

interface ChartCardProps {
  dense?: boolean;
  title?: ReactNode;
  description?: string;
  height?: number;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  exportable?: boolean;
  menuItems?: OverflowMenuItem[];
}

function exportBackground(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--c-white").trim() || "#FFFFFF";
}

export default function ChartCard({ title, description, height, actions, footer, children, exportable = true, dense = false, menuItems = [] }: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const capture = useCallback(async <T,>(render: (node: HTMLDivElement) => Promise<T>): Promise<T> => {
    const card = cardRef.current!;
    const attribution = card.querySelector<HTMLElement>("[data-attribution]");
    const hidden = Array.from(card.querySelectorAll<HTMLElement>("[data-controls], [data-export-btn]"));
    const revealed = Array.from(card.querySelectorAll<HTMLElement>("[data-export-reveal]"));
    if (attribution) attribution.style.display = "flex";
    hidden.forEach((el) => (el.style.display = "none"));
    revealed.forEach((el) => (el.style.display = el.dataset.exportReveal!));
    try {
      return await render(card);
    } finally {
      if (attribution) attribution.style.display = "none";
      hidden.forEach((el) => (el.style.display = ""));
      revealed.forEach((el) => (el.style.display = ""));
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const { toJpeg } = await import("html-to-image");
      const dataUrl = await capture((node) => toJpeg(node, { quality: 0.95, backgroundColor: exportBackground(), pixelRatio: 2 }));
      const link = document.createElement("a");
      link.download = `snotel-chart-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [exporting, capture]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    const filename = `snotel-chart-${Date.now()}.png`;
    let blob: Blob | null = null;
    try {
      const { toBlob } = await import("html-to-image");
      blob = await capture((node) => toBlob(node, { backgroundColor: exportBackground(), pixelRatio: 2 }));
      if (!blob) throw new Error("Empty image");
      const file = new File([blob], filename, { type: "image/png" });
      if (!navigator.canShare?.({ files: [file] })) throw new DOMException("Sharing files unsupported", "NotSupportedError");
      await navigator.share({ files: [file] });
    } catch (err) {
      const name = (err as DOMException).name;
      if (blob && (name === "NotSupportedError" || name === "NotAllowedError")) {
        const link = document.createElement("a");
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      } else if (name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setExporting(false);
    }
  }, [exporting, capture]);

  const handleCopy = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const blob = import("html-to-image").then(({ toBlob }) =>
        capture((node) => toBlob(node, { backgroundColor: exportBackground(), pixelRatio: 2 }))
      ).then((b) => {
        if (!b) throw new Error("Empty image");
        return b;
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    } finally {
      setExporting(false);
    }
  }, [exporting, capture]);

  return (
    <div
      ref={cardRef}
      className={`${dense ? "p-4" : "p-3 sm:p-6"} rounded-lg border relative`}
      style={{ background: theme.white, borderColor: theme.borderGray }}
    >
      {dense && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="min-w-0 flex items-baseline gap-x-2 flex-wrap text-[15px] font-medium" style={{ color: theme.black }}>
            {title}
            {description && (
              <span className="font-mono text-xs font-normal" style={{ color: theme.mediumGray }}>
                {description}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {actions && <div data-controls className="flex items-center">{actions}</div>}
            {(exportable || menuItems.length > 0) && (
              <OverflowMenu
                items={[
                  ...menuItems,
                  ...(exportable
                    ? [
                        { label: copied ? "Copied" : "Copy image", onSelect: handleCopy, disabled: exporting },
                        { label: "Download image", onSelect: handleExport, disabled: exporting },
                      ]
                    : []),
                ]}
              />
            )}
          </div>
        </div>
      )}
      {!dense && (title || exportable) && (
        <div className="flex items-start justify-between gap-x-4 gap-y-2 flex-wrap">
          {title && (
            <h3
              className="text-lg mb-2 font-medium flex items-center gap-1 flex-1 min-w-[14rem]"
              style={{ color: theme.black }}
            >
              {title}
            </h3>
          )}
          {(actions || exportable) && (
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {actions && (
                <div data-controls className="hidden md:flex items-center">
                  {actions}
                  <span className="w-px h-4 mx-1" style={{ background: theme.borderGray }} />
                </div>
              )}
              {exportable && (
                <button
                  data-export-btn
                  onClick={handleShare}
                  disabled={exporting}
                  className="md:hidden shrink-0 p-2.5 rounded-md transition-colors duration-150 hover:bg-[var(--c-hover)] cursor-pointer"
                  style={{ color: theme.gray }}
                  aria-label="Share chart as image"
                >
                  <Share size={16} />
                </button>
              )}
              {exportable && (
                <button
                  data-export-btn
                  onClick={handleCopy}
                  disabled={exporting}
                  className="hidden md:block shrink-0 p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--c-hover)] cursor-pointer"
                  style={{ color: copied ? theme.darkGray : theme.gray }}
                  aria-label={copied ? "Copied" : "Copy chart as image"}
                  title={copied ? "Copied" : "Copy as image"}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
              {exportable && (
                <button
                  data-export-btn
                  onClick={handleExport}
                  disabled={exporting}
                  className="hidden md:block shrink-0 p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--c-hover)] cursor-pointer"
                  style={{ color: theme.gray }}
                  aria-label="Export chart as image"
                  title="Export as image"
                >
                  <Download size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {!dense && description && (
        <p
          className="text-xs mb-4 max-w-2xl font-mono"
          style={{ color: theme.gray, lineHeight: 1.6 }}
        >
          {description}
        </p>
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
