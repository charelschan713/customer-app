import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api, { TENANT_SLUG } from '../../../src/lib/api';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney } from '../../../src/lib/format';

const SERVICE_TYPES = [
  { label: 'Airport Transfer', value: 'AIRPORT_TRANSFER' },
  { label: 'Point to Point', value: 'POINT_TO_POINT' },
  { label: 'Hourly Hire', value: 'HOURLY_HIRE' },
];

export default function BookScreen() {
  const [form, setForm] = useState({
    pickup: '', dropoff: '', date: '', time: '',
    passengers: '1', luggage: '1', serviceType: 'AIRPORT_TRANSFER',
  });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const getQuote = async () => {
    if (!form.pickup || !form.dropoff || !form.date || !form.time) {
      Alert.alert('Required', 'Please fill in pickup, dropoff, date and time');
      return;
    }
    setLoading(true);
    try {
      const pickupAt = `${form.date}T${form.time}:00`;
      const res = await api.post('/public/quote', {
        tenant_slug: TENANT_SLUG,
        pickup_address: form.pickup,
        dropoff_address: form.dropoff,
        pickup_at: pickupAt,
        passenger_count: parseInt(form.passengers),
        luggage_count: parseInt(form.luggage),
        service_type: form.serviceType,
      });
      const results = res.data?.results ?? res.data ?? [];
      if (!results.length) {
        Alert.alert('No vehicles available', 'Please try a different route or time.');
        return;
      }
      router.push({ pathname: '/(app)/book/cars', params: { quote: JSON.stringify(res.data), form: JSON.stringify(form) } });
    } catch (e: any) {
      Alert.alert('Quote Failed', e.response?.data?.message ?? 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Book a Ride</Text>

          {/* Service type */}
          <Text style={styles.label}>Service Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {SERVICE_TYPES.map(s => (
              <TouchableOpacity key={s.value}
                style={[styles.chip, form.serviceType === s.value && styles.chipActive]}
                onPress={() => set('serviceType')(s.value)}>
                <Text style={[styles.chipText, form.serviceType === s.value && styles.chipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pickup */}
          <Text style={styles.label}>Pickup Address *</Text>
          <TextInput style={styles.input} value={form.pickup} onChangeText={set('pickup')}
            placeholder="e.g. Sydney International Airport T1" placeholderTextColor={MUTED}
            multiline />

          {/* Dropoff */}
          <Text style={[styles.label, { marginTop: 14 }]}>Drop-off Address *</Text>
          <TextInput style={styles.input} value={form.dropoff} onChangeText={set('dropoff')}
            placeholder="e.g. 1 Macquarie St, Sydney" placeholderTextColor={MUTED}
            multiline />

          {/* Date & Time */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={form.date} onChangeText={set('date')}
                placeholder="2026-03-15" placeholderTextColor={MUTED} keyboardType="numbers-and-punctuation" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Time * (HH:MM)</Text>
              <TextInput style={styles.input} value={form.time} onChangeText={set('time')}
                placeholder="09:00" placeholderTextColor={MUTED} keyboardType="numbers-and-punctuation" />
            </View>
          </View>

          {/* Pax / Luggage */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Passengers</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => set('passengers')(String(Math.max(1, parseInt(form.passengers) - 1)))}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{form.passengers}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => set('passengers')(String(parseInt(form.passengers) + 1))}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Luggage</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => set('luggage')(String(Math.max(0, parseInt(form.luggage) - 1)))}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{form.luggage}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => set('luggage')(String(parseInt(form.luggage) + 1))}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.btn} onPress={getQuote} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Get Quote →</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', color: TEXT, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: MUTED, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#000' },
  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  stepBtn: { paddingHorizontal: 18, paddingVertical: 14 },
  stepBtnText: { color: GOLD, fontSize: 20, fontWeight: '700' },
  stepVal: { flex: 1, textAlign: 'center', color: TEXT, fontSize: 16, fontWeight: '700' },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
