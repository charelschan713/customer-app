import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, Image, ActionSheetIOS,
} from 'react-native';

const LOGO_URL = process.env.EXPO_PUBLIC_LOGO_URL ?? null;
const LOCAL_LOGO = require('../assets/logo.png');
import { router } from 'expo-router';
import { loginWithEmail, loginWithOtp, fetchAndStoreUser } from '../src/lib/auth';
import { registerPushToken } from '../src/lib/notifications';
import api, { TENANT_SLUG } from '../src/lib/api';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED } from '../src/lib/format';

const COUNTRY_CODES = [
  { code: '+61', label: 'Australia (+61)' },
  { code: '+1',  label: 'USA / Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+91', label: 'India (+91)' },
];

type Tab = 'email' | 'email-otp' | 'sms-otp';

export default function LoginScreen() {
  const [tab, setTab] = useState<Tab>('email');

  // Email/password
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Email OTP
  const [otpEmail, setOtpEmail]   = useState('');
  const [emailOtp, setEmailOtp]   = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  // SMS OTP
  const [phoneCode, setPhoneCode] = useState('+61');
  const [phone, setPhone]         = useState('');
  const [smsOtp, setSmsOtp]       = useState('');
  const [smsOtpSent, setSmsOtpSent] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading]     = useState(false);

  const startCountdown = () => {
    setCountdown(60);
    const iv = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; }), 1000);
  };

  const sendSmsOtp = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await api.post('/customer-auth/otp/send', { tenantSlug: TENANT_SLUG, phone: `${phoneCode}${phone}` });
      setSmsOtpSent(true);
      startCountdown();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const sendEmailOtp = async () => {
    if (!otpEmail) return;
    setLoading(true);
    try {
      await api.post('/customer-auth/email-otp/send', { tenantSlug: TENANT_SLUG, email: otpEmail });
      setEmailOtpSent(true);
      startCountdown();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to send email OTP');
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (tab === 'email') {
        await loginWithEmail(email, password);
      } else if (tab === 'sms-otp') {
        await loginWithOtp(phoneCode, phone, smsOtp);
      } else {
        // email-otp — verify then login
        await loginWithEmailOtp(otpEmail, emailOtp);
      }
      await registerPushToken().catch(() => {});
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.message ?? e.message ?? 'Please try again');
    } finally { setLoading(false); }
  };

  const loginWithEmailOtp = async (emailAddr: string, code: string) => {
    const res = await api.post('/customer-auth/email-otp/verify', { tenantSlug: TENANT_SLUG, email: emailAddr, otp: code });
    await fetchAndStoreUser(res.data.accessToken);
  };

  const showCountryPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', ...COUNTRY_CODES.map(c => c.label)], cancelButtonIndex: 0, title: 'Select Country Code' },
        (idx) => { if (idx > 0) setPhoneCode(COUNTRY_CODES[idx - 1].code); }
      );
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'email',     label: 'Password' },
    { key: 'email-otp', label: 'Email OTP' },
    { key: 'sms-otp',  label: 'SMS OTP' },
  ];

  const canSubmit =
    (tab === 'email'     && email && password) ||
    (tab === 'email-otp' && emailOtpSent && emailOtp.length === 6) ||
    (tab === 'sms-otp'   && smsOtpSent && smsOtp.length === 6);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Image source={LOGO_URL ? { uri: LOGO_URL } : LOCAL_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {tabs.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => { setTab(t.key); setEmailOtpSent(false); setSmsOtpSent(false); }}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Password login */}
        {tab === 'email' && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="you@example.com" placeholderTextColor={MUTED}
                keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                placeholder="••••••••" placeholderTextColor={MUTED} secureTextEntry />
            </View>
          </View>
        )}

        {/* Email OTP */}
        {tab === 'email-otp' && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput style={styles.input} value={otpEmail} onChangeText={setOtpEmail}
                placeholder="you@example.com" placeholderTextColor={MUTED}
                keyboardType="email-address" autoCapitalize="none" editable={!emailOtpSent} />
            </View>
            {!emailOtpSent ? (
              <TouchableOpacity style={styles.btn} onPress={sendEmailOtp} disabled={loading || !otpEmail}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Send Code</Text>}
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput style={[styles.input, styles.otpInput]}
                    value={emailOtp} onChangeText={t => setEmailOtp(t.replace(/\D/g,'').slice(0,6))}
                    placeholder="000000" placeholderTextColor={MUTED} keyboardType="number-pad" />
                </View>
                <TouchableOpacity style={styles.resend} onPress={countdown > 0 ? undefined : sendEmailOtp} disabled={countdown > 0}>
                  <Text style={[styles.resendText, countdown > 0 && { opacity: 0.4 }]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* SMS OTP */}
        {tab === 'sms-otp' && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Mobile Number</Text>
              <TouchableOpacity style={styles.codeDropdown} onPress={showCountryPicker}>
                <Text style={styles.codeDropdownText}>{phoneCode} ▾</Text>
              </TouchableOpacity>
              <TextInput style={[styles.input, { marginTop: 8 }]} value={phone} onChangeText={setPhone}
                placeholder="412 345 678" placeholderTextColor={MUTED} keyboardType="phone-pad"
                editable={!smsOtpSent} />
            </View>
            {!smsOtpSent ? (
              <TouchableOpacity style={styles.btn} onPress={sendSmsOtp} disabled={loading || !phone}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Send OTP</Text>}
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>OTP Code</Text>
                  <TextInput style={[styles.input, styles.otpInput]}
                    value={smsOtp} onChangeText={t => setSmsOtp(t.replace(/\D/g,'').slice(0,6))}
                    placeholder="000000" placeholderTextColor={MUTED} keyboardType="number-pad" />
                </View>
                <TouchableOpacity style={styles.resend} onPress={countdown > 0 ? undefined : sendSmsOtp} disabled={countdown > 0}>
                  <Text style={[styles.resendText, countdown > 0 && { opacity: 0.4 }]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {canSubmit && (
          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.link} onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Don't have an account? <Text style={{ color: GOLD }}>Register</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 260, height: 44, marginBottom: 24, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: TEXT },
  subtitle: { fontSize: 15, color: MUTED, marginTop: 6 },
  tabs: { flexDirection: 'row', backgroundColor: '#ebebeb', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1a1a1a' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#fff', fontSize: 12, fontWeight: '700' },
  form: { gap: 16, marginBottom: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: MUTED },
  input: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER },
  codeDropdown: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  codeDropdownText: { color: TEXT, fontSize: 15, fontWeight: '600' },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: '700' },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  resend: { alignItems: 'center', paddingVertical: 8 },
  resendText: { color: GOLD, fontSize: 14 },
  link: { alignItems: 'center', marginTop: 24 },
  linkText: { color: MUTED, fontSize: 14 },
});
