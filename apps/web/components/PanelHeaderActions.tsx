"use client";

import type { CSSProperties, ReactNode } from "react";
import { Maximize2, Minimize2, Star, X } from "lucide-react";
import { glassmorphicButtonStyle, theme } from "@/lib/theme";

interface PanelHeaderActionsProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  plain?: boolean;
}

function HeaderButton({ label, color, plain, onClick, className = "", children }: { label: string; color?: string; plain: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  const style: CSSProperties = plain
    ? { color: color ?? theme.darkGray, background: "rgba(0,0,0,0.06)", border: `1px solid ${theme.borderGray}` }
    : { color: color ?? "rgba(255,255,255,0.9)", ...glassmorphicButtonStyle };
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition duration-150 active:scale-[0.94] cursor-pointer ${className}`}
      style={style}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function PanelHeaderActions({ isFavorite, onToggleFavorite, onClose, expanded = false, onToggleExpand, plain = false }: PanelHeaderActionsProps) {
  return (
    <div className="absolute top-3 right-3 flex items-center gap-2">
      <HeaderButton
        label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        color={isFavorite ? "#FBBF24" : undefined}
        plain={plain}
        onClick={onToggleFavorite}
      >
        <Star size={18} fill={isFavorite ? "#FBBF24" : "none"} />
      </HeaderButton>
      {onToggleExpand && (
        <HeaderButton label={expanded ? "Collapse panel" : "Expand panel"} plain={plain} onClick={onToggleExpand}>
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </HeaderButton>
      )}
      <HeaderButton label="Close panel" plain={plain} onClick={onClose} className="max-md:w-auto max-md:gap-1.5 max-md:pl-3 max-md:pr-4">
        <X size={18} />
        <span className="md:hidden text-sm font-sans font-semibold">Close</span>
      </HeaderButton>
    </div>
  );
}
