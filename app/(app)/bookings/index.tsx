import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../../src/lib/api';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney, fmtDateShort } from '../../../src/lib/format';

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#22c55e', PENDING_CUSTOMER_CONFIRMATION: '#f59e0b',
  COMPLETED: '#6366f1', CANCELLED: '#ef4444', IN_PROGRESS: '#3b82f6',
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
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(app)/book')}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {bookings.length === 0 && !isLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
          </View>
        )}
        {bookings.map((b: any) => {
          const color = STATUS_COLOR[b.operational_status] ?? '#888';
          return (
            <TouchableOpacity key={b.id} style={styles.card} onPress={() => router.push(`/(app)/bookings/${b.id}`)}>
              <View style={styles.cardTop}>
                <Text style={styles.ref}>{b.booking_reference}</Text>
                <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.badgeText, { color }]}>{b.operational_status?.replace(/_/g,' ')}</Text>
                </View>
              </View>
              <Text style={styles.date}>📅 {fmtDateShort(b.pickup_at_utc)}</Text>
              <View style={styles.route}>
                <View style={styles.routeRow}>
                  <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.addr} numberOfLines={1}>{b.pickup_address_text}</Text>
                </View>
                <View style={styles.routeRow}>
                  <View style={[styles.dot, { backgroundColor: GOLD }]} />
                  <Text style={styles.addr} numberOfLines={1}>{b.dropoff_address_text}</Text>
                </View>
              </View>
              <View style={styles.footer}>
                <Text style={styles.vehicle}>{b.car_type_name ?? b.service_class_name}</Text>
                <Text style={styles.amount}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: TEXT },
  newBtn: { backgroundColor: GOLD, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { color: '#000', fontWeight: '700' },
  card: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 13, color: MUTED },
  route: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  addr: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  vehicle: { fontSize: 13, color: MUTED },
  amount: { fontSize: 16, fontWeight: '700', color: GOLD },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, color: MUTED },
});
