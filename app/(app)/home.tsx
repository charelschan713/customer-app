import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { getStoredUser } from '../../src/lib/auth';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney, fmtDateShort } from '../../src/lib/format';

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#22c55e',
  PENDING_CUSTOMER_CONFIRMATION: '#f59e0b',
  COMPLETED: '#6366f1',
  CANCELLED: '#ef4444',
  IN_PROGRESS: '#3b82f6',
};

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { getStoredUser().then(setUser); }, []);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/bookings', { params: { upcoming: true, limit: 3 } });
      return res.data?.data ?? res.data ?? [];
    },
  });

  const next = bookings[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.greetSub}>Good day,</Text>
            <Text style={styles.greetName}>{user?.first_name ?? 'Welcome'} ✦</Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(app)/book')}>
            <Text style={styles.bookBtnText}>+ Book</Text>
          </TouchableOpacity>
        </View>

        {/* Next trip */}
        {next && (
          <TouchableOpacity style={styles.nextCard} onPress={() => router.push(`/(app)/bookings/${next.id}`)}>
            <Text style={styles.nextLabel}>UPCOMING TRIP</Text>
            <View style={styles.nextRef}>
              <Text style={styles.nextRefText}>{next.booking_reference}</Text>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[next.operational_status] ?? '#888') + '25' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[next.operational_status] ?? '#888' }]}>
                  {next.operational_status?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.nextTime}>📅 {fmtDateShort(next.pickup_at_utc)}</Text>
            <View style={styles.route}>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.addr} numberOfLines={1}>{next.pickup_address_text}</Text>
              </View>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: GOLD }]} />
                <Text style={styles.addr} numberOfLines={1}>{next.dropoff_address_text}</Text>
              </View>
            </View>
            <Text style={styles.nextTotal}>{fmtMoney(next.total_price_minor, next.currency)}</Text>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          {[
            { icon: '🚗', label: 'Book a Ride', onPress: () => router.push('/(app)/book') },
            { icon: '📋', label: 'My Trips', onPress: () => router.push('/(app)/bookings') },
            { icon: '💳', label: 'Payment', onPress: () => router.push('/(app)/payments') },
            { icon: '👤', label: 'Profile', onPress: () => router.push('/(app)/profile') },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent trips */}
        {bookings.length > 1 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/bookings')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {bookings.slice(1).map((b: any) => (
              <TouchableOpacity key={b.id} style={styles.tripCard} onPress={() => router.push(`/(app)/bookings/${b.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRef}>{b.booking_reference}</Text>
                  <Text style={styles.tripDate}>{fmtDateShort(b.pickup_at_utc)}</Text>
                </View>
                <Text style={styles.tripAmt}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {!isLoading && bookings.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✦</Text>
            <Text style={styles.emptyTitle}>No upcoming trips</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/(app)/book')}>
              <Text style={styles.btnText}>Book Your First Ride</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greetSub: { fontSize: 13, color: MUTED },
  greetName: { fontSize: 24, fontWeight: '700', color: TEXT },
  bookBtn: { backgroundColor: GOLD, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  bookBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  nextCard: { backgroundColor: '#13161d', borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 20, marginBottom: 28, gap: 10 },
  nextLabel: { fontSize: 10, color: GOLD, fontWeight: '700', letterSpacing: 2 },
  nextRef: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextRefText: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'monospace' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  nextTime: { fontSize: 13, color: MUTED },
  route: { gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addr: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  nextTotal: { fontSize: 22, fontWeight: '700', color: GOLD, textAlign: 'right' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  seeAll: { fontSize: 13, color: GOLD },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  actionCard: { width: '47%', backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 18, alignItems: 'center', gap: 8 },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: TEXT },
  tripCard: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tripRef: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'monospace' },
  tripDate: { fontSize: 12, color: MUTED, marginTop: 2 },
  tripAmt: { fontSize: 16, fontWeight: '700', color: GOLD },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 40, color: GOLD },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: TEXT },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  btnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
