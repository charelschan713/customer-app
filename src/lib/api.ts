import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://chauffeur-saas-production.up.railway.app';
export const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG ?? 'aschauffeured';

const api = axios.create({ baseURL: BASE, timeout: 20000 });

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
    }
    return Promise.reject(err);
  },
);

export default api;
