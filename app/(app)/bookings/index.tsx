import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/lib/api';
import { BG, CARD, TEXT, SUB, MUTED, BORDER, SEPARATOR, GOLD, fmtMoney, fmtDate } from '../../../src/lib/format';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED:                     { label: 'Confirmed',        color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  PENDING_CUSTOMER_CONFIRMATION: { label: 'Awaiting Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  ASSIGNED:                      { label: 'Assigned',         color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.08)' },
  IN_PROGRESS:                   { label: 'In Progress',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  COMPLETED:                     { label: 'Completed',        color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
  CANCELLED:                     { label: 'Cancelled',        color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

export default function BookingsScreen() {
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/bookings');
      return res.data?.data ?? res.data ?? [];
    },
    refetchInterval: 30000,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(app)/book')} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.newBtnText}>Book</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {isLoading && <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />}

        {!isLoading && bookings.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={52} color={MUTED + '66'} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
          </View>
        )}

        {bookings.map((b: any) => {
          const s = STATUS_MAP[b.operational_status] ?? { label: b.operational_status, color: MUTED, bg: 'rgba(255,255,255,0.06)' };
          return (
            <TouchableOpacity key={b.id} style={styles.card} onPress={() => router.push(`/(app)/bookings/${b.id}`)} activeOpacity={0.8}>
              <View style={styles.row}>
                <Text style={styles.ref}>{b.booking_reference}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <View style={[styles.row, { marginTop: 10 }]}>
                <Text style={styles.dateText}>🕐 {fmtDate(b.pickup_at_utc)}</Text>
              </View>
              <View style={styles.routeBlock}>
                <View style={styles.routeRow}>
                  <View style={[styles.dot, { backgroundColor: GOLD }]} />
                  <Text style={styles.routeAddr} numberOfLines={1}>{b.pickup_address_text}</Text>
                </View>
                {b.dropoff_address_text && (
                  <View style={styles.routeRow}>
                    <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{b.dropoff_address_text}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.row, styles.cardFooter]}>
                <View style={styles.vehicleRow}>
                  <Ionicons name="car-outline" size={13} color={MUTED} />
                  <Text style={styles.vehicleText}>{b.car_type_name ?? b.service_class_name ?? '—'}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={MUTED} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: TEXT },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ref:       { fontSize: 13, fontWeight: '700', color: GOLD, letterSpacing: 0.5 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dateText:  { fontSize: 14, fontWeight: '600', color: TEXT },
  routeBlock: { marginTop: 10, gap: 8 },
  routeRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot:        { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  routeAddr:  { flex: 1, fontSize: 14, color: SUB, lineHeight: 20 },
  cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: SEPARATOR },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vehicleText:{ fontSize: 13, color: MUTED },
  priceRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price:      { fontSize: 16, fontWeight: '700', color: GOLD },
  empty:      { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
});
