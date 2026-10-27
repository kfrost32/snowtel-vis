"use client";

import { Star, X as XIcon } from "lucide-react";
import { theme } from "@/lib/theme";

interface SidebarFavoriteItemProps {
  name: string;
  detail?: string;
  onClick: () => void;
  onRemove: () => void;
}

export default function SidebarFavoriteItem({ name, detail, onClick, onRemove }: SidebarFavoriteItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-1.5 max-md:py-2.5 max-md:min-h-[44px] cursor-pointer hover:bg-[var(--c-hover)] transition-colors group"
    >
      <Star size={12} fill="#FBBF24" stroke="#FBBF24" className="shrink-0" />
      <span className="text-xs font-sans font-medium truncate" style={{ color: theme.darkGray }}>{name}</span>
      {detail && <span className="text-xs font-mono" style={{ color: theme.mediumGray }}>{detail}</span>}
      <span
        role="button"
        aria-label="Remove from favorites"
        className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 max-md:opacity-100 max-md:-m-2 max-md:p-2 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <XIcon size={12} style={{ color: theme.gray }} />
      </span>
    </button>
  );
}
