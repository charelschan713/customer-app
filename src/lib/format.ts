// ── Design tokens — 1:1 ASDriver style, gold replaces green ──
export const GOLD    = '#c8a96b';   // brand accent (ASDriver uses #22c55e for earnings)
export const BG      = '#f5f5f5';   // page background
export const CARD    = '#ffffff';   // card background
export const DARK    = '#1a1a1a';   // hero card / primary button
export const TEXT    = '#1a1a1a';   // primary text
export const SUB     = '#666666';   // secondary text
export const MUTED   = '#999999';   // muted / section titles
export const BORDER  = '#f0f0f0';   // dividers / card borders
export const INPUT   = '#f5f5f5';   // input background
export const INPUT_BORDER = '#e8e8e8'; // input border

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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function fmtDateShort(dt: string) {
  return new Date(dt).toLocaleString('en-AU', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
