import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { logout } from '../../src/lib/auth';
import { BG, CARD, DARK, TEXT, SUB, MUTED, BORDER, INPUT, INPUT_BORDER, GOLD } from '../../src/lib/format';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => { const res = await api.get('/customer-portal/profile'); return res.data; },
  });

  useEffect(() => {
    if (profile) setForm({
      first_name: profile.first_name ?? '',
      last_name:  profile.last_name  ?? '',
      email:      profile.email      ?? '',
      phone:      profile.phone      ?? '',
    });
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/customer-portal/profile', form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); setEditing(false); },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'Update failed'),
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DARK} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header (1:1 ASDriver) ── */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity onPress={() => editing ? updateMutation.mutate() : setEditing(true)}>
          {updateMutation.isPending
            ? <ActivityIndicator color={DARK} />
            : <Text style={styles.editLink}>{editing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll}>
        {/* ── Profile hero card (1:1 ASDriver dark card) ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.first_name?.[0] ?? '?').toUpperCase()}
              {(profile?.last_name?.[0] ?? '').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.customerName}>{profile?.first_name} {profile?.last_name}</Text>
          <Text style={styles.customerEmail}>{profile?.email}</Text>
          {profile?.tier && profile.tier !== 'STANDARD' && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{profile.tier} Member</Text>
            </View>
          )}
        </View>

        {/* ── Personal details card ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>PERSONAL DETAILS</Text>
          </View>
          {editing ? (
            <>
              <InputField label="First Name" value={form.first_name} onChange={set('first_name')} />
              <InputField label="Last Name"  value={form.last_name}  onChange={set('last_name')} />
              <InputField label="Email"      value={form.email}      onChange={set('email')} type="email" />
              <InputField label="Phone"      value={form.phone}      onChange={set('phone')} type="phone" />
            </>
          ) : (
            <>
              <Row label="First Name" value={profile?.first_name} />
              <Row label="Last Name"  value={profile?.last_name} />
              <Row label="Email"      value={profile?.email} />
              <Row label="Phone"      value={profile?.phone} />
            </>
          )}
        </View>

        {editing && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Sign out (1:1 ASDriver) ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value || '—'}</Text>
    </View>
  );
}

function InputField({ label, value, onChange, type }: any) {
  return (
    <View style={rowStyles.inputGroup}>
      <Text style={rowStyles.inputLabel}>{label}</Text>
      <TextInput
        style={rowStyles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : 'default'}
        autoCapitalize={type === 'email' ? 'none' : 'words'}
        placeholderTextColor={MUTED}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 14, color: SUB, flex: 1 },
  value: { fontSize: 14, color: TEXT, fontWeight: '500', flex: 2, textAlign: 'right' },
  inputGroup: { gap: 6, marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  input: {
    backgroundColor: INPUT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: TEXT,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  title:    { fontSize: 20, fontWeight: '700', color: TEXT },
  editLink: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },

  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 12 },

  // ── Profile hero card (dark, 1:1 ASDriver) ──
  profileCard: {
    backgroundColor: DARK,
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  avatarText:    { fontSize: 26, fontWeight: '700', color: '#fff' },
  customerName:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  customerEmail: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  tierBadge: {
    backgroundColor: GOLD + '25',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginTop: 4,
    borderWidth: 1, borderColor: GOLD + '40',
  },
  tierText: { fontSize: 12, fontWeight: '700', color: GOLD },

  // ── Info card (white, 1:1 ASDriver) ──
  card: {
    backgroundColor: CARD,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, padding: 16, gap: 10,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── Buttons ──
  cancelBtn: {
    backgroundColor: CARD, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  cancelText: { color: SUB, fontWeight: '600', fontSize: 15 },
  signOutButton: {
    backgroundColor: CARD, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
