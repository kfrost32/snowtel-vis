"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { theme } from "@/lib/theme";

interface InfoTooltipProps {
  text: string;
  size?: number;
}

export default function InfoTooltip({ text, size = 12 }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        onMouseEnter={() => { updatePos(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center rounded-full cursor-pointer"
        style={{ color: theme.mediumGray, width: size + 4, height: size + 4 }}
        aria-label="More info"
      >
        <Info size={size} />
      </button>
      {open && pos && createPortal(
        <span
          className="fixed w-56 px-3 py-2 rounded-lg shadow-lg font-sans text-xs leading-relaxed pointer-events-none"
          style={{
            zIndex: 9999,
            top: pos.top - window.scrollY,
            left: pos.left,
            transform: "translate(-50%, -100%) translateY(-6px)",
            background: theme.darkGray,
            color: theme.offWhite,
          }}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  );
}
