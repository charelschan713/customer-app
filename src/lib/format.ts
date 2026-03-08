export const GOLD   = process.env.EXPO_PUBLIC_PRIMARY_COLOR ?? '#c8a96b';
export const BG     = '#f5f5f5';
export const CARD   = '#ffffff';
export const BORDER = '#f0f0f0';
export const TEXT   = '#1a1a1a';
export const MUTED  = '#666666';
export const DARK   = '#1a1a1a';

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
