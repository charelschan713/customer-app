import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { loginWithEmail, loginWithOtp } from '../src/lib/auth';
import { registerPushToken } from '../src/lib/notifications';
import api from '../src/lib/api';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED } from '../src/lib/format';

const COUNTRY_CODES = ['+61', '+1', '+44', '+64', '+65', '+852'];

export default function LoginScreen() {
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  // Email tab
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  // Phone tab
  const [phoneCode, setPhoneCode] = useState('+61');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [otpSent, setOtpSent]     = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);

  const startCountdown = () => {
    setCountdown(60);
    const iv = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; }), 1000);
  };

  const sendOtp = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await api.post('/customer-portal/auth/send-otp', { phone_country_code: phoneCode, phone_number: phone });
      setOtpSent(true);
      startCountdown();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      if (tab === 'email') {
        await loginWithEmail(email, password);
      } else {
        await loginWithOtp(phoneCode, phone, otp);
      }
      await registerPushToken().catch(() => {});
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.message ?? e.message ?? 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>ASCHAUFFEURED</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['email', 'phone'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'email' ? 'Email' : 'Phone OTP'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'email' ? (
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
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codePicker}>
                  {COUNTRY_CODES.map(c => (
                    <TouchableOpacity key={c} style={[styles.codeBtn, phoneCode === c && styles.codeBtnActive]} onPress={() => setPhoneCode(c)}>
                      <Text style={[styles.codeText, phoneCode === c && styles.codeTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TextInput style={[styles.input, { marginTop: 8 }]} value={phone} onChangeText={setPhone}
                placeholder="412 345 678" placeholderTextColor={MUTED} keyboardType="phone-pad" />
            </View>
            {otpSent && (
              <View style={styles.field}>
                <Text style={styles.label}>OTP Code</Text>
                <TextInput style={[styles.input, styles.otpInput]} value={otp} onChangeText={t => setOtp(t.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000" placeholderTextColor={MUTED} keyboardType="number-pad" />
              </View>
            )}
            {!otpSent ? (
              <TouchableOpacity style={styles.btn} onPress={sendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Send OTP</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.resend} onPress={countdown > 0 ? undefined : sendOtp} disabled={countdown > 0}>
                <Text style={[styles.resendText, countdown > 0 && { opacity: 0.4 }]}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(tab === 'email' || otpSent) && (
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
  logo: { fontSize: 20, color: GOLD, fontWeight: '700', marginBottom: 16, letterSpacing: 4, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '700', color: TEXT },
  subtitle: { fontSize: 15, color: MUTED, marginTop: 6 },
  tabs: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: GOLD },
  tabText: { fontSize: 14, fontWeight: '600', color: MUTED },
  tabTextActive: { color: '#000' },
  form: { gap: 16, marginBottom: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: MUTED },
  input: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER },
  phoneRow: { flexDirection: 'row' },
  codePicker: { flexGrow: 0 },
  codeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 6, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  codeBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
  codeText: { color: MUTED, fontWeight: '600' },
  codeTextActive: { color: '#000' },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: '700' },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  resend: { alignItems: 'center', paddingVertical: 8 },
  resendText: { color: GOLD, fontSize: 14 },
  link: { alignItems: 'center', marginTop: 24 },
  linkText: { color: MUTED, fontSize: 14 },
});
