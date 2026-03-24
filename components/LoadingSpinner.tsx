"use client";

import { theme, snowColors } from "@/lib/theme";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ message, fullScreen = false }: LoadingSpinnerProps) {
  const inner = (
    <div className="text-center">
      <div
        className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
        style={{ borderColor: snowColors.swe, borderTopColor: "transparent" }}
      />
      {message && (
        <p className="font-mono text-sm" style={{ color: theme.gray }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {inner}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      {inner}
    </div>
  );
}
