// ── Design tokens — 1:1 ASDriverNative (Theme.swift exact values) ──
export const BG      = '#1A1A2E';   // Color.brandDark
export const CARD    = '#222236';   // Color.brandCard
export const CARD_ELEVATED = '#16162A'; // Color.brandDarkElevated
export const BORDER  = '#333355';   // Color.brandCardBorder
export const TEXT    = '#FFFFFF';   // white
export const SUB     = '#9CA3AF';   // Color.brandTextSecondary
export const MUTED   = '#9CA3AF';   // same
export const GOLD    = '#C8A870';   // Color.brandGold
export const SUCCESS = '#22C55E';   // Color.brandSuccess
export const WARNING = '#F59E0B';   // Color.brandWarning
export const ERROR   = '#EF4444';   // Color.brandError
export const BLUE    = '#3B82F6';   // Color.brandBlue
export const PURPLE  = '#8B5CF6';   // Color.brandPurple

// ── These keep existing API compat ──
export const DARK       = '#1A1A2E';
export const INPUT      = 'rgba(255,255,255,0.06)';
export const INPUT_BORDER = '#333355';
export const SEPARATOR  = '#333355';

export function fmtMoney(minor: number | string | null | undefined, currency = 'AUD') {
  const n = Number(minor ?? 0) / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// 1:1 ASDriverNative format: "Sun, 22 Feb · 4:00 pm"
export function fmtDate(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  const weekday = d.toLocaleString('en-AU', { weekday: 'short', timeZone: 'Australia/Sydney' });
  const day     = d.toLocaleString('en-AU', { day: 'numeric', timeZone: 'Australia/Sydney' });
  const month   = d.toLocaleString('en-AU', { month: 'short', timeZone: 'Australia/Sydney' });
  const time    = d.toLocaleString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Australia/Sydney' }).toLowerCase();
  return `${weekday}, ${day} ${month} · ${time}`;
}

export function fmtDateShort(dt: string) {
  return new Date(dt).toLocaleString('en-AU', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
