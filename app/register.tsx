import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';

const LOGO_URL = process.env.EXPO_PUBLIC_LOGO_URL ?? null;
const LOCAL_LOGO = require('../assets/logo.png');
import { router } from 'expo-router';
import { register } from '../src/lib/auth';
import { registerPushToken } from '../src/lib/notifications';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED } from '../src/lib/format';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', phone_country_code: '+61', phone_number: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.first_name || !form.email || !form.password) {
      Alert.alert('Required', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      await registerPushToken().catch(() => {});
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Registration Failed', e.response?.data?.message ?? e.message ?? 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Image source={LOGO_URL ? { uri: LOGO_URL } : LOCAL_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join ASChauffeured today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} value={form.first_name} onChangeText={set('first_name')} placeholder="John" placeholderTextColor={MUTED} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} value={form.last_name} onChangeText={set('last_name')} placeholder="Smith" placeholderTextColor={MUTED} />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={set('email')} placeholder="you@example.com" placeholderTextColor={MUTED} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} value={form.password} onChangeText={set('password')} placeholder="Min 8 characters" placeholderTextColor={MUTED} secureTextEntry />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Mobile (optional)</Text>
            <View style={styles.phoneRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>+61</Text>
              </View>
              <TextInput style={[styles.input, { flex: 1 }]} value={form.phone_number} onChangeText={set('phone_number')} placeholder="412 345 678" placeholderTextColor={MUTED} keyboardType="phone-pad" />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => router.replace('/login')}>
          <Text style={styles.linkText}>Already have an account? <Text style={{ color: GOLD }}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  back: { alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: GOLD, fontSize: 15, fontWeight: '500' },
  logo: { width: 260, height: 44, marginBottom: 24, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: MUTED, marginTop: 4 },
  form: { gap: 14, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: MUTED },
  input: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: BORDER },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeBox: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  codeText: { color: '#fff', fontWeight: '600' },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', marginTop: 20 },
  linkText: { color: MUTED, fontSize: 14 },
});
