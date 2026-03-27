"use client";

import { useEffect, useState, useCallback } from "react";
import { theme, snowColors } from "@/lib/theme";
import { timeAgo } from "@/lib/formatting";

interface ServiceStatus {
  name: string;
  ok: boolean;
  latency: number;
  status?: number;
  error?: string;
}

interface StatusData {
  timestamp: number;
  services: {
    soap: ServiceStatus;
    csv: ServiceStatus;
  };
  overall: "operational" | "degraded" | "down";
}

const STATUS_COLORS = {
  operational: snowColors.nearNormal,
  degraded: snowColors.below,
  down: snowColors.wellBelow,
};

const STATUS_LABELS = {
  operational: "All Systems Operational",
  degraded: "Partial Outage",
  down: "Major Outage",
};

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [checking, setChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/status");
      const data: StatusData = await res.json();
      setStatus(data);
      setLastChecked(Date.now());
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const overall = status?.overall ?? "down";
  const color = STATUS_COLORS[overall as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.down;

  return (
    <div className="min-h-screen" style={{ background: theme.offWhite }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <a
            href="/"
            className="font-mono text-xs uppercase tracking-wider"
            style={{ color: theme.mediumGray }}
          >
            SNOTEL Explorer
          </a>
          <h1
            className="font-sans font-bold text-2xl sm:text-3xl mt-2"
            style={{ color: theme.black }}
          >
            System Status
          </h1>
        </div>

        {/* Overall Status */}
        <div
          className="p-5 sm:p-6 rounded-lg border mb-6"
          style={{ background: theme.white, borderColor: theme.borderGray }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                background: color,
                boxShadow: `0 0 8px ${color}60`,
                animation: checking ? "pulse 1s infinite" : "none",
              }}
            />
            <span
              className="font-sans font-semibold text-lg"
              style={{ color: theme.black }}
            >
              {STATUS_LABELS[overall as keyof typeof STATUS_LABELS] ?? "Checking..."}
            </span>
          </div>
          {lastChecked && (
            <div className="mt-2 font-mono text-[11px]" style={{ color: theme.mediumGray }}>
              Checked {timeAgo(lastChecked)}
            </div>
          )}
        </div>

        {/* Service Details */}
        {status && (
          <div className="space-y-3 mb-8">
            {Object.values(status.services).map((svc) => (
              <div
                key={svc.name}
                className="p-4 rounded-lg border flex items-center justify-between"
                style={{ background: theme.white, borderColor: theme.borderGray }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: svc.ok ? snowColors.nearNormal : snowColors.wellBelow }}
                  />
                  <span className="font-sans text-sm font-medium" style={{ color: theme.black }}>
                    {svc.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {svc.ok ? (
                    <span className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
                      {svc.latency}ms
                    </span>
                  ) : (
                    <span className="font-mono text-[11px]" style={{ color: snowColors.wellBelow }}>
                      {svc.error || `HTTP ${svc.status}`}
                    </span>
                  )}
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: svc.ok ? `${snowColors.nearNormal}18` : `${snowColors.wellBelow}18`,
                      color: svc.ok ? snowColors.nearNormal : snowColors.wellBelow,
                    }}
                  >
                    {svc.ok ? "UP" : "DOWN"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="font-mono text-[11px]" style={{ color: theme.mediumGray }}>
            SNOTEL Explorer depends on the USDA NRCS web services for snowpack data.
            When these services are unavailable, cached data is served automatically.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
