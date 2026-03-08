import * as SecureStore from 'expo-secure-store';
import api, { TENANT_SLUG } from './api';

async function fetchAndStoreUser(accessToken: string) {
  await SecureStore.setItemAsync('token', accessToken);
  // Fetch full customer profile
  const profile = await api.get('/customer-portal/profile');
  const customer = profile.data;
  await SecureStore.setItemAsync('user', JSON.stringify(customer));
  return customer;
}

export async function loginWithEmail(email: string, password: string) {
  const res = await api.post('/customer-auth/login', { tenantSlug: TENANT_SLUG, email, password });
  return fetchAndStoreUser(res.data.accessToken);
}

export async function loginWithOtp(phoneCode: string, phone: string, otp: string) {
  const res = await api.post('/customer-auth/otp/verify', {
    tenantSlug: TENANT_SLUG,
    phone: `${phoneCode}${phone}`,
    otp,
  });
  return fetchAndStoreUser(res.data.accessToken);
}

export async function register(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_country_code: string;
  phone_number: string;
}) {
  const res = await api.post('/customer-auth/register', {
    tenantSlug: TENANT_SLUG,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    password: data.password,
    phoneCountryCode: data.phone_country_code || '+61',
    phoneNumber: data.phone_number || undefined,
  });
  return fetchAndStoreUser(res.data.accessToken);
}

export async function logout() {
  await SecureStore.deleteItemAsync('token');
  await SecureStore.deleteItemAsync('user');
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync('user');
  return raw ? JSON.parse(raw) : null;
}

export async function isLoggedIn() {
  const token = await SecureStore.getItemAsync('token');
  return !!token;
}
