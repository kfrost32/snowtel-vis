export const SIDEBAR_WIDTH = 300;
export const SIDEBAR_INSET = 12;
export const DETAIL_MAX = 560;
export const DETAIL_WIDTH = `min(${DETAIL_MAX}px, 50vw)`;
export const EXPANDED_DETAIL_MAX = 1100;

export const GLASS_STYLE = {
  background: "var(--c-glass)",
  backdropFilter: "blur(24px) saturate(140%)",
  WebkitBackdropFilter: "blur(24px) saturate(140%)",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.06)",
};

export const GLASS_BUTTON =
  "relative after:absolute after:inset-0 after:rounded-[inherit] after:bg-[var(--c-hover)] after:opacity-0 hover:after:opacity-100 after:transition-opacity active:scale-[0.96] transition cursor-pointer";
