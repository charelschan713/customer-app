// ── Design tokens — 1:1 ASDriver dark navy theme ──
export const BG      = '#131829';   // page background (dark navy)
export const CARD    = '#1e2437';   // card background
export const CARD2   = '#252b3d';   // elevated card / inner card
export const TABBAR  = '#1a2035';   // tab bar background
export const TEXT    = '#ffffff';   // primary text
export const SUB     = 'rgba(255,255,255,0.60)';  // secondary text
export const MUTED   = 'rgba(255,255,255,0.35)';  // muted text
export const BORDER  = 'rgba(255,255,255,0.08)';  // subtle border
export const GOLD    = '#c8a96b';   // brand accent (booking refs, active tab, prices)
export const INPUT   = 'rgba(255,255,255,0.06)';  // input background
export const INPUT_BORDER = 'rgba(255,255,255,0.12)'; // input border
export const DARK    = '#1a1a1a';   // not used in dark theme
export const SEPARATOR = 'rgba(255,255,255,0.07)'; // list separator

export function fmtMoney(minor: number | string | null | undefined, currency = 'AUD') {
  const n = Number(minor ?? 0) / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtDate(dt: string) {
  return new Date(dt).toLocaleString('en-AU', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function fmtDateShort(dt: string) {
  return new Date(dt).toLocaleString('en-AU', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
