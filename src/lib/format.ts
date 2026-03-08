export const GOLD = '#c8a96b';
export const BG   = '#0d0f14';
export const CARD = '#13161d';
export const BORDER = 'rgba(200,169,107,0.15)';
export const TEXT  = '#ffffff';
export const MUTED = 'rgba(255,255,255,0.45)';

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
