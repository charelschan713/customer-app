import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://chauffeur-saas-production.up.railway.app';
export const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG ?? 'aschauffeured';

const api = axios.create({ baseURL: BASE, timeout: 20000 });

// ── Unauthorised callback ─────────────────────────────────────────────────
// Expo Router cannot be imported in this module (outside React tree).
// Set this handler from _layout.tsx to redirect to login on 401.
let _onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  _onUnauthorized = fn;
};

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-tenant-slug'] = TENANT_SLUG;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      // Notify app layout to redirect to login
      _onUnauthorized?.();
    }
    return Promise.reject(err);
  },
);

export default api;
