/**
 * ThemeContext — Tenant brand token layer for the Customer App.
 *
 * Architecture:
 *   1. On mount: read from env vars (EXPO_PUBLIC_*) as immediate defaults
 *   2. In background: fetch /public/tenant-info for live branding data
 *   3. Cache result in AsyncStorage for offline use
 *   4. Expose useTheme() hook to all screens
 *
 * Tenant-configurable tokens:
 *   primaryColor  — main brand/accent color (hex string, default GOLD)
 *   logoUrl       — brand mark URL or null (falls back to LOCAL_LOGO)
 *   companyName   — display name used in headers and titles
 *   slug          — tenant identifier
 *
 * Platform layout tokens (NOT configurable by tenant):
 *   bg, card, border, text, muted, etc. — locked platform dark theme
 *
 * Phase 3 note:
 *   Currently designed for white-label env-var builds:
 *     EXPO_PUBLIC_TENANT_SLUG=aschauffeured
 *     EXPO_PUBLIC_COMPANY_NAME=ASChauffeured
 *     EXPO_PUBLIC_LOGO_URL=https://...
 *     EXPO_PUBLIC_PRIMARY_COLOR=#C8A870
 *   Future: can switch to fully dynamic API-driven mode by removing env-var defaults.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://chauffeur-saas-production.up.railway.app';
const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG ?? 'aschauffeured';

const CACHE_KEY = `tenant_theme_${TENANT_SLUG}`;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

// ── Platform-locked design tokens (NOT tenant-configurable) ──────────────────
export const PLATFORM = {
  BG:           '#1A1A2E',
  CARD:         '#222236',
  CARD_ELEVATED:'#16162A',
  BORDER:       '#333355',
  TEXT:         '#FFFFFF',
  MUTED:        '#9CA3AF',
  SUCCESS:      '#22C55E',
  WARNING:      '#F59E0B',
  ERROR:        '#EF4444',
  BLUE:         '#3B82F6',
  PURPLE:       '#8B5CF6',
  INPUT:        'rgba(255,255,255,0.06)',
  INPUT_BORDER: '#333355',
} as const;

// ── Tenant-configurable theme shape ──────────────────────────────────────────
export interface TenantTheme {
  slug:         string;
  companyName:  string;
  primaryColor: string;   // hex, e.g. '#C8A870'
  logoUrl:      string | null;
  websiteUrl:   string | null;
  currency:     string;
  timezone:     string;
}

// ── Default theme (ASChauffeured / platform fallback) ────────────────────────
const defaultTheme: TenantTheme = {
  slug:         TENANT_SLUG,
  companyName:  process.env.EXPO_PUBLIC_COMPANY_NAME ?? 'ASChauffeured',
  primaryColor: process.env.EXPO_PUBLIC_PRIMARY_COLOR ?? '#C8A870',
  logoUrl:      process.env.EXPO_PUBLIC_LOGO_URL ?? null,
  websiteUrl:   null,
  currency:     'AUD',
  timezone:     'Australia/Sydney',
};

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext<TenantTheme>(defaultTheme);

export function useTheme(): TenantTheme {
  return useContext(ThemeContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);

  useEffect(() => {
    async function loadTheme() {
      // Step 1: try cached theme first (instant, offline-safe)
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL_MS) {
            setTheme(data);
            return; // fresh cache — skip API call
          }
        }
      } catch {}

      // Step 2: fetch live from API
      try {
        const res = await fetch(
          `${API_BASE}/public/tenant-info?tenant_slug=${encodeURIComponent(TENANT_SLUG)}`,
          { headers: { 'x-tenant-slug': TENANT_SLUG } },
        );
        if (!res.ok) return;
        const raw = await res.json();

        const normalized: TenantTheme = {
          slug:         raw.slug        ?? TENANT_SLUG,
          companyName:  raw.company_name ?? raw.name ?? defaultTheme.companyName,
          primaryColor: hslToHex(raw.primary_color) ?? defaultTheme.primaryColor,
          logoUrl:      raw.logo_url    ?? defaultTheme.logoUrl,
          websiteUrl:   raw.website_url ?? null,
          currency:     raw.currency    ?? 'AUD',
          timezone:     raw.timezone    ?? 'Australia/Sydney',
        };

        setTheme(normalized);

        // Cache with timestamp
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: normalized, ts: Date.now() }),
        );
      } catch {
        // API unavailable — keep default/env-var theme; no crash
      }
    }

    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert HSL string "39 46% 60%" to hex.
 * The portal stores colors as HSL strings; the app needs hex for StyleSheet.
 * Returns null if input is null/invalid (caller uses fallback).
 */
function hslToHex(hsl: string | null | undefined): string | null {
  if (!hsl) return null;
  try {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length < 3) return null;

    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return null;
  }
}
