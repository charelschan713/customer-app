import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { logout } from '../../src/lib/auth';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED } from '../../src/lib/format';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/profile');
      return res.data;
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message ?? 'Update failed'),
  });

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/login');
      }},
    ]);
  };

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={GOLD} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => editing ? updateMutation.mutate() : setEditing(true)}>
          {updateMutation.isPending ? <ActivityIndicator color={GOLD} /> :
            <Text style={styles.editBtn}>{editing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Dark hero header — ASDriver style */}
        <View style={{ backgroundColor: '#1a1a1a', borderRadius: 20, margin: 16, padding: 24, alignItems: 'center', gap: 8 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.first_name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{profile?.email}</Text>
          {profile?.tier && profile.tier !== 'STANDARD' && (
            <View style={{ backgroundColor: GOLD, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#000' }}>{profile.tier}</Text>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 16 }}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PERSONAL DETAILS</Text>
          <Field label="First Name" value={form.first_name} onChange={set('first_name')} editing={editing} />
          <Field label="Last Name" value={form.last_name} onChange={set('last_name')} editing={editing} />
          <Field label="Email" value={form.email} onChange={set('email')} editing={editing} type="email" />
          <Field label="Phone" value={form.phone} onChange={set('phone')} editing={editing} type="phone" />
        </View>

        {editing && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, editing, type }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      {editing ? (
        <TextInput
          style={{ backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER }}
          value={value} onChangeText={onChange}
          keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : 'default'}
          autoCapitalize={type === 'email' ? 'none' : 'words'}
        />
      ) : (
        <Text style={{ fontSize: 15, color: value ? TEXT : MUTED }}>{value || '—'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: TEXT },
  editBtn: { color: GOLD, fontSize: 16, fontWeight: '600' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 10, color: GOLD, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  cancelBtn: { borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: MUTED, fontWeight: '600' },
  logoutBtn: { borderRadius: 14, borderWidth: 1, borderColor: '#ef4444' + '50', paddingVertical: 16, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
