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
      className="w-full flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-black/[0.02] transition-colors group"
    >
      <Star size={10} fill="#FBBF24" stroke="#FBBF24" className="shrink-0" />
      <span className="text-xs font-sans font-medium truncate" style={{ color: theme.darkGray }}>{name}</span>
      {detail && <span className="text-[10px] font-mono" style={{ color: theme.mediumGray }}>{detail}</span>}
      <span
        role="button"
        aria-label="Remove from favorites"
        className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
      >
        <XIcon size={10} style={{ color: theme.gray }} />
      </span>
    </button>
  );
}
