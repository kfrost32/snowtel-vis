"use client";

import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Loader2, Share, X } from "lucide-react";
import { theme } from "@/lib/theme";
import { useDismiss } from "@/hooks/useDismiss";
import { track } from "@/lib/analytics";
import { legendFor } from "@/lib/map-legend";
import { SITE_NAME } from "@/lib/site";
import { GLASS_STYLE } from "@/lib/map-layout";
import { copyImage, downloadBlob, shareImage } from "@/lib/image-export";
import type { MapSnapshot } from "@/lib/map-snapshot";
import { placeLabel } from "@snotel/core/place";

interface MapSnapshotDialogProps {
  snapshot: MapSnapshot;
  metric: string;
  dataDate: string | null;
  states: string[];
  onClose: () => void;
}

function overlayScale(width: number): number {
  return Math.min(1.6, Math.max(1.1, width / 900));
}

function SnapshotOverlay({ snapshot, metric, dataDate, states, ref }: Omit<MapSnapshotDialogProps, "onClose"> & { ref: Ref<HTMLDivElement> }) {
  const { title, items } = legendFor(metric);
  const heading = dataDate ? `${title} · ${dataDate}` : title;
  const place = placeLabel(snapshot.view, states);
  const width = snapshot.canvas.width / snapshot.pixelRatio;
  const u = (px: number) => px * overlayScale(width);
  const inset = u(12);
  const card = { ...GLASS_STYLE, borderRadius: u(14) };

  return (
    <div ref={ref} className="relative font-sans" style={{ width, color: theme.black }}>
      <div style={{ height: snapshot.canvas.height / snapshot.pixelRatio }} />
      <div className="absolute" style={{ ...card, top: inset, left: inset, maxWidth: "62%", padding: `${u(10)}px ${u(14)}px` }}>
        <div className="font-semibold" style={{ fontSize: u(16), lineHeight: 1.25, color: theme.darkGray }}>{heading}</div>
        {place && <div style={{ fontSize: u(13), marginTop: u(2), color: theme.gray }}>{place}</div>}
      </div>
      <div
        className="absolute flex items-center font-semibold tracking-tight"
        style={{ ...card, top: inset, right: inset, borderRadius: 999, height: u(36), padding: `0 ${u(14)}px`, fontSize: u(15), color: theme.black }}
      >
        {SITE_NAME}
      </div>
      <div
        className="flex items-center justify-between flex-wrap border-t"
        style={{ background: theme.white, borderColor: theme.borderGray, padding: `${u(8)}px ${inset}px`, columnGap: u(16), rowGap: u(4) }}
      >
        <div className="flex items-center flex-wrap" style={{ columnGap: u(12), rowGap: u(4) }}>
          {items.map(({ label, color }) => (
            <div key={label} className="flex items-center" style={{ gap: u(6) }}>
              <div className="rounded-full" style={{ width: u(10), height: u(10), background: color }} />
              <span className="font-mono" style={{ fontSize: u(12), color: theme.gray }}>{label}</span>
            </div>
          ))}
        </div>
        {snapshot.attribution && (
          <div className="font-mono" style={{ fontSize: u(9), color: theme.mediumGray }}>{snapshot.attribution}</div>
        )}
      </div>
    </div>
  );
}

export default function MapSnapshotDialog({ snapshot, metric, dataDate, states, onClose }: MapSnapshotDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const preview = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  const filename = `snotel-map-${metric.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.png`;
  const canCopy = typeof ClipboardItem !== "undefined";
  const canShare = typeof navigator.canShare === "function";

  useDismiss(ref, true, onClose);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { toCanvas } = await import("html-to-image");
      const overlay = await toCanvas(overlayRef.current!, { pixelRatio: snapshot.pixelRatio });
      const out = document.createElement("canvas");
      out.width = overlay.width;
      out.height = overlay.height;
      const context = out.getContext("2d")!;
      context.drawImage(snapshot.canvas, 0, 0);
      context.drawImage(overlay, 0, 0);
      const image = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
      if (!image) throw new Error("Empty image");
      if (!cancelled) setBlob(image);
    })().catch((err) => {
      console.error("Map image failed:", err);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  const act = (method: string, action: (image: Blob) => Promise<void> | void) => async () => {
    if (!blob) return;
    track("map_snapshot", { method, metric });
    try {
      await action(blob);
    } catch (err) {
      console.error(`Map image ${method} failed:`, err);
    }
  };

  const buttonClass = "flex items-center justify-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium transition hover:bg-[var(--c-hover)] cursor-pointer disabled:opacity-50 disabled:cursor-default";

  return createPortal(
    <>
      {!blob && !failed && (
        <div aria-hidden className="fixed pointer-events-none" style={{ left: -100000, top: 0 }}>
          <SnapshotOverlay ref={overlayRef} snapshot={snapshot} metric={metric} dataDate={dataDate} states={states} />
        </div>
      )}
      <div className="fixed inset-0 flex items-center justify-center p-4 motion-safe:animate-[fadeIn_150ms_ease-out]" style={{ zIndex: 70, background: "rgba(0,0,0,0.4)" }}>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby="snapshot-title"
          className="relative w-full max-w-3xl p-4 rounded-xl font-sans flex flex-col gap-3 motion-safe:animate-[scaleIn_150ms_ease-out]"
          style={{ background: theme.white, border: `1px solid ${theme.borderGray}`, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
        >
          <div className="flex items-center justify-between">
            <h2 id="snapshot-title" className="text-sm font-semibold tracking-tight" style={{ color: theme.black }}>Map image</h2>
            <button onClick={onClose} aria-label="Close" className="flex items-center justify-center size-8 rounded-full hover:bg-[var(--c-hover)] transition cursor-pointer">
              <X size={16} style={{ color: theme.gray }} />
            </button>
          </div>
          <div className="flex items-center justify-center min-h-48 rounded-lg overflow-hidden border" style={{ borderColor: theme.borderGray, background: "var(--c-hairline)" }}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Map image preview" className="block max-w-full max-h-[65dvh] object-contain" />
            ) : failed ? (
              <span className="text-sm" style={{ color: theme.gray }}>Couldn’t create the image.</span>
            ) : (
              <span className="flex items-center gap-2 text-sm" style={{ color: theme.gray }}>
                <Loader2 size={16} className="animate-spin" /> Preparing image…
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-1.5" style={{ color: theme.darkGray }}>
            {canCopy && (
              <button
                className={`${buttonClass} max-md:hidden`}
                disabled={!blob}
                onClick={act("copy", async (image) => {
                  await copyImage(image);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
              </button>
            )}
            <button className={buttonClass} disabled={!blob} onClick={act("download", (image) => downloadBlob(image, filename))}>
              <Download size={16} /> Download
            </button>
            {canShare && (
              <button className={buttonClass} disabled={!blob} onClick={act("share", (image) => shareImage(image, filename))}>
                <Share size={16} /> Share
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
