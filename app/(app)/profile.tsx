import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../src/lib/api';
import { logout } from '../../src/lib/auth';
import { BG, CARD, BORDER, TEXT, MUTED, GOLD, ERROR } from '../../src/lib/format';

export default function ProfileScreen() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phoneCode: '+61', phoneNumber: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/customer-portal/profile').then(r => r.data),
  });

  useEffect(() => {
    if (profile) setForm({
      firstName: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      phoneCode: profile.phone_country_code ?? '+61',
      phoneNumber: profile.phone_number ?? '',
    });
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: (data: typeof form) => api.put('/customer-portal/profile', {
      firstName: data.firstName, lastName: data.lastName,
      phoneCountryCode: data.phoneCode, phoneNumber: data.phoneNumber,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); setEditing(false); },
    onError: () => Alert.alert('Error', 'Failed to save profile'),
  });

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/login');
      }},
    ]);
  };

  const NAV_ITEMS = [
    { icon: 'people-outline' as const,    label: 'Manage Passengers', desc: 'Saved passenger profiles',  href: '/(app)/passengers' },
    { icon: 'card-outline' as const,      label: 'Payment Methods',   desc: 'Saved cards & billing',     href: '/(app)/payments' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={GOLD} size="large" />
      </SafeAreaView>
    );
  }

  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!editing && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Ionicons name="pencil-outline" size={13} color={GOLD} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar + name card */}
        <View style={styles.avatarCard}>
          {/* Gold gradient circle (1:1 web) */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {editing ? (
            <View style={{ flex: 1, gap: 10 }}>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} value={form.firstName}
                  onChangeText={v => setForm(f => ({ ...f, firstName: v }))} placeholder="First name" placeholderTextColor={MUTED + '60'} />
                <TextInput style={[styles.input, { flex: 1 }]} value={form.lastName}
                  onChangeText={v => setForm(f => ({ ...f, lastName: v }))} placeholder="Last name" placeholderTextColor={MUTED + '60'} />
              </View>
              <View style={styles.row}>
                <TextInput style={[styles.input, { width: 90 }]} value={form.phoneCode}
                  onChangeText={v => setForm(f => ({ ...f, phoneCode: v }))} placeholder="+61" placeholderTextColor={MUTED + '60'} keyboardType="phone-pad" />
                <TextInput style={[styles.input, { flex: 1 }]} value={form.phoneNumber}
                  onChangeText={v => setForm(f => ({ ...f, phoneNumber: v }))} placeholder="4xx xxx xxx" placeholderTextColor={MUTED + '60'} keyboardType="phone-pad" />
              </View>
              <View style={styles.row}>
                <TouchableOpacity style={styles.saveBtn} onPress={() => updateMut.mutate(form)} disabled={updateMut.isPending}>
                  {updateMut.isPending
                    ? <ActivityIndicator color="#000" size="small" />
                    : <><Ionicons name="checkmark" size={16} color="#000" /><Text style={styles.saveBtnText}>Save</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Ionicons name="close" size={16} color={MUTED} />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
              <Text style={styles.email} numberOfLines={1}>{profile?.email}</Text>
              {profile?.phone_number && (
                <Text style={styles.phone}>{profile?.phone_country_code} {profile?.phone_number}</Text>
              )}
              {/* Tier / discount badges */}
              <View style={[styles.row, { marginTop: 8, gap: 6 }]}>
                {profile?.tier && profile.tier !== 'STANDARD' && (
                  <View style={styles.tierBadge}><Text style={styles.tierText}>{profile.tier}</Text></View>
                )}
                {Number(profile?.discount_rate) > 0 && (
                  <View style={styles.discountBadge}><Text style={styles.discountText}>{Number(profile.discount_rate).toFixed(0)}% OFF</Text></View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Nav items — 1:1 web */}
        <View style={styles.section}>
          {NAV_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.navRow, i < NAV_ITEMS.length - 1 && styles.navRowBorder]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.href as any); }}
              activeOpacity={0.7}
            >
              <View style={styles.navIcon}>
                <Ionicons name={item.icon} size={20} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.navLabel}>{item.label}</Text>
                <Text style={styles.navDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED + '60'} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={ERROR} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  title:     { fontSize: 18, fontWeight: '600', color: TEXT },
  editBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: GOLD + '1A', borderWidth: 0.5, borderColor: GOLD + '40' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: GOLD },

  avatarCard: { flexDirection: 'row', gap: 16, backgroundColor: CARD, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER, padding: 20, marginBottom: 16, alignItems: 'flex-start' },
  avatar:     { width: 64, height: 64, borderRadius: 32, backgroundColor: GOLD + '59', borderWidth: 2, borderColor: GOLD + '4D', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  name:       { fontSize: 16, fontWeight: '600', color: TEXT },
  email:      { fontSize: 13, color: MUTED + '73', marginTop: 2 },
  phone:      { fontSize: 13, color: MUTED + '99', marginTop: 2 },
  tierBadge:  { backgroundColor: GOLD + '33', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tierText:   { fontSize: 11, fontWeight: '700', color: GOLD },
  discountBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  discountText:  { fontSize: 11, fontWeight: '700', color: '#92400e' },

  row:    { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input:  { height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: BG, borderWidth: 0.5, borderColor: BORDER, fontSize: 14, color: TEXT },
  saveBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: GOLD },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#000' },
  cancelBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 0.5, borderColor: BORDER },
  cancelBtnText: { fontSize: 14, color: MUTED },

  section: { backgroundColor: CARD, borderRadius: 20, borderWidth: 0.5, borderColor: BORDER, overflow: 'hidden', marginBottom: 16 },
  navRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, minHeight: 64, paddingVertical: 12 },
  navRowBorder: { borderBottomWidth: 0.5, borderBottomColor: BORDER },
  navIcon:  { width: 40, height: 40, borderRadius: 12, backgroundColor: GOLD + '1A', borderWidth: 0.5, borderColor: GOLD + '2E', alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 14, fontWeight: '500', color: TEXT },
  navDesc:  { fontSize: 12, color: MUTED + '99', marginTop: 2 },

  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, borderWidth: 0.5, borderColor: ERROR + '40', backgroundColor: ERROR + '14' },
  logoutText: { fontSize: 15, fontWeight: '600', color: ERROR },
});
