import * as SecureStore from 'expo-secure-store';
import api from './api';

export async function loginWithEmail(email: string, password: string) {
  const res = await api.post('/customer-portal/auth/login', { email, password });
  const { accessToken, customer } = res.data;
  await SecureStore.setItemAsync('token', accessToken);
  await SecureStore.setItemAsync('user', JSON.stringify(customer));
  return customer;
}

export async function loginWithOtp(phoneCode: string, phone: string, otp: string) {
  const res = await api.post('/customer-portal/auth/verify-otp', {
    phone_country_code: phoneCode,
    phone_number: phone,
    otp_code: otp,
  });
  const { accessToken, customer } = res.data;
  await SecureStore.setItemAsync('token', accessToken);
  await SecureStore.setItemAsync('user', JSON.stringify(customer));
  return customer;
}

export async function register(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_country_code: string;
  phone_number: string;
}) {
  const res = await api.post('/customer-portal/auth/register', data);
  const { accessToken, customer } = res.data;
  await SecureStore.setItemAsync('token', accessToken);
  await SecureStore.setItemAsync('user', JSON.stringify(customer));
  return customer;
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
