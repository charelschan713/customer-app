import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { logout } from '../../src/lib/auth';
import { BG, CARD, TEXT, SUB, MUTED, BORDER, SEPARATOR, GOLD } from '../../src/lib/format';

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
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ── Big title (1:1 ASDriver "More" screen) ── */}
        <Text style={styles.pageTitle}>More</Text>

        {/* ── Profile card (ASDriver: avatar + name + subtitle in card) ── */}
        <TouchableOpacity style={styles.profileCard} onPress={() => setEditing(!editing)} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.first_name} {profile?.last_name}</Text>
            <Text style={styles.profileSub}>
              {profile?.tier && profile.tier !== 'STANDARD' ? `${profile.tier} Member` : 'Standard Member'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </TouchableOpacity>

        {/* ── Edit form (if editing) ── */}
        {editing && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EDIT PROFILE</Text>
            {[
              { label: 'First Name', key: 'first_name' },
              { label: 'Last Name',  key: 'last_name' },
              { label: 'Email',      key: 'email' },
              { label: 'Phone',      key: 'phone' },
            ].map(({ label, key }) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[key]}
                  onChangeText={set(key)}
                  placeholderTextColor={MUTED}
                  keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}
                  autoCapitalize={key === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Account section (ASDriver: icon + label rows) ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="card-outline"   label="Payment Methods" onPress={() => router.push('/(app)/payments')} />
          <View style={styles.divider} />
          <MenuItem icon="receipt-outline" label="Invoices"        onPress={() => router.push('/(app)/invoices')} />
          <View style={styles.divider} />
          <MenuItem icon="person-outline"  label="Profile"         onPress={() => setEditing(!editing)} />
          <View style={styles.divider} />
          <MenuItem icon="people-outline"  label="Passengers"      onPress={() => router.push('/(app)/bookings' as any)} />
        </View>

        {/* ── Sign out (ASDriver red style) ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={GOLD} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  pageTitle: { fontSize: 32, fontWeight: '700', color: TEXT, marginBottom: 20 },

  // Profile card (1:1 ASDriver)
  profileCard: {
    backgroundColor: CARD, borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center',
    gap: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 24,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: GOLD + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 18, fontWeight: '700', color: GOLD },
  profileName:  { fontSize: 16, fontWeight: '700', color: TEXT },
  profileSub:   { fontSize: 13, color: SUB, marginTop: 2 },

  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: MUTED,
    marginBottom: 10, paddingLeft: 4,
  },

  // Menu card (ASDriver list style)
  menuCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 14,
  },
  menuIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: GOLD + '20', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, color: TEXT, fontWeight: '500' },
  divider:   { height: 1, backgroundColor: SEPARATOR, marginLeft: 62 },

  // Sign out
  signOutBtn: {
    backgroundColor: CARD, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },

  // Edit form
  card:       { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
  cardTitle:  { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: SUB, marginBottom: 5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelBtn:  { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: SUB, fontWeight: '600' },
  saveBtn:    { flex: 1, borderRadius: 10, backgroundColor: GOLD, paddingVertical: 12, alignItems: 'center' },
  saveBtnText:{ color: '#000', fontWeight: '700' },
});
