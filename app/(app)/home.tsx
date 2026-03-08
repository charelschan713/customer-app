import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { getStoredUser } from '../../src/lib/auth';
import { GOLD, fmtMoney, fmtDateShort } from '../../src/lib/format';

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#22c55e',
  PENDING_CUSTOMER_CONFIRMATION: '#f59e0b',
  COMPLETED: '#8b5cf6',
  CANCELLED: '#ef4444',
  IN_PROGRESS: '#3b82f6',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  PENDING_CUSTOMER_CONFIRMATION: 'Awaiting Payment',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  IN_PROGRESS: 'In Progress',
};

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { getStoredUser().then(setUser); }, []);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/bookings', { params: { upcoming: true, limit: 4 } });
      return res.data?.data ?? res.data ?? [];
    },
  });

  const next = bookings[0];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#999" />}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetSub}>Welcome back,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.greetName}>{user?.first_name ?? 'Guest'}</Text>
              {user?.tier && user.tier !== 'STANDARD' && (
                <View style={[styles.badge, {
                  backgroundColor: user.tier === 'VIP' ? GOLD : user.tier === 'PLATINUM' ? '#7c3aed20' : '#1a1a1a',
                }]}>
                  <Text style={[styles.badgeText, { color: user.tier === 'VIP' ? '#000' : user.tier === 'PLATINUM' ? '#7c3aed' : '#fff' }]}>
                    {user.tier}
                  </Text>
                </View>
              )}
              {user?.discount_rate > 0 && (
                <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.badgeText, { color: '#16a34a' }]}>{Number(user.discount_rate).toFixed(0)}% OFF</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(app)/book')}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.bookBtnText}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* Next trip card */}
        {next ? (
          <TouchableOpacity style={styles.nextCard} onPress={() => router.push(`/(app)/bookings/${next.id}`)}>
            <View style={styles.nextCardHeader}>
              <Text style={styles.nextLabel}>UPCOMING TRIP</Text>
              <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[next.operational_status] ?? '#888') + '18' }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[next.operational_status] ?? '#888' }]} />
                <Text style={[styles.statusText, { color: STATUS_COLOR[next.operational_status] ?? '#888' }]}>
                  {STATUS_LABEL[next.operational_status] ?? next.operational_status?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.nextRef}>{next.booking_reference}</Text>
            <Text style={styles.nextTime}>{fmtDateShort(next.pickup_at_utc)}</Text>
            <View style={styles.divider} />
            <View style={styles.route}>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.addr} numberOfLines={1}>{next.pickup_address_text}</Text>
              </View>
              <View style={[styles.routeLine]} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.addr} numberOfLines={1}>{next.dropoff_address_text}</Text>
              </View>
            </View>
            <View style={styles.nextFooter}>
              <Text style={styles.nextVehicle}>{next.service_class_name ?? ''}</Text>
              <Text style={styles.nextTotal}>{fmtMoney(next.total_price_minor, next.currency)}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/(app)/book')}>
            <Ionicons name="car-outline" size={36} color="#ccc" />
            <Text style={styles.emptyTitle}>No upcoming trips</Text>
            <Text style={styles.emptySubtitle}>Book your next ride</Text>
            <View style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Book Now</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          {[
            { icon: 'car-outline' as const, label: 'Book', onPress: () => router.push('/(app)/book') },
            { icon: 'time-outline' as const, label: 'Trips', onPress: () => router.push('/(app)/bookings') },
            { icon: 'card-outline' as const, label: 'Wallet', onPress: () => router.push('/(app)/payments') },
            { icon: 'person-outline' as const, label: 'Profile', onPress: () => router.push('/(app)/profile') },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.onPress}>
              <View style={styles.actionIconWrap}>
                <Ionicons name={a.icon} size={22} color="#1a1a1a" />
              </View>
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
                <View style={styles.tripIconWrap}>
                  <Ionicons name="car" size={18} color="#1a1a1a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripRef}>{b.booking_reference}</Text>
                  <Text style={styles.tripDate}>{fmtDateShort(b.pickup_at_utc)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.tripAmt}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[b.operational_status] ?? '#888') + '15' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[b.operational_status] ?? '#888', fontSize: 10 }]}>
                      {STATUS_LABEL[b.operational_status] ?? b.operational_status?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetSub: { fontSize: 13, color: '#999', marginBottom: 2 },
  greetName: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Next trip card
  nextCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20, marginBottom: 28, gap: 8 },
  nextCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  nextRef: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  nextTime: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  route: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeLine: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addr: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  nextFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  nextVehicle: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  nextTotal: { fontSize: 22, fontWeight: '700', color: GOLD },

  // Empty state
  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, marginBottom: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: '#999' },
  emptyBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Sections
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  seeAll: { fontSize: 13, color: GOLD, fontWeight: '600' },

  // Quick actions
  actions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  actionIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },

  // Recent trips
  tripCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  tripIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  tripRef: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  tripDate: { fontSize: 12, color: '#999', marginTop: 2 },
  tripAmt: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
});
