import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { getStoredUser } from '../../src/lib/auth';
import { BG, CARD, DARK, TEXT, SUB, MUTED, BORDER, GOLD, fmtMoney, fmtDateShort } from '../../src/lib/format';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:                     '#22c55e',
  PENDING_CUSTOMER_CONFIRMATION: '#f59e0b',
  COMPLETED:                     '#8b5cf6',
  CANCELLED:                     '#ef4444',
  IN_PROGRESS:                   '#3b82f6',
  ASSIGNED:                      '#3b82f6',
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
        <ActivityIndicator size="large" color={DARK} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.first_name ?? 'Guest'} 👋</Text>
          <Text style={styles.subGreeting}>
            {next ? '🚗 You have an upcoming trip' : '✅ No upcoming trips'}
          </Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(app)/book')}>
          <Text style={styles.bookBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={DARK} />}
      >
        {/* ── Membership badge ── */}
        {(user?.tier && user.tier !== 'STANDARD') && (
          <View style={styles.section}>
            <View style={styles.memberCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberLabel}>MEMBERSHIP</Text>
                <Text style={styles.memberTier}>{user.tier}</Text>
                {user.discount_rate > 0 && (
                  <Text style={styles.memberDiscount}>{Number(user.discount_rate).toFixed(0)}% personal discount applied</Text>
                )}
              </View>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>★</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Current / next trip ── */}
        {next && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚗 Upcoming Trip</Text>
            <TouchableOpacity
              style={styles.activeJobCard}
              onPress={() => router.push(`/(app)/bookings/${next.id}`)}
              activeOpacity={0.85}
            >
              {/* Status badge */}
              <View style={styles.jobHeader}>
                <Text style={styles.bookingNumber}>#{next.booking_reference}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[next.operational_status] ?? '#888') + '25' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[next.operational_status] ?? '#888' }]}>
                    {next.operational_status?.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              {/* Route */}
              <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.routeText} numberOfLines={1}>{next.pickup_address_text}</Text>
                </View>
                {next.dropoff_address_text && (
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>{next.dropoff_address_text}</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.jobFooter}>
                <Text style={styles.dateTime}>📅 {fmtDateShort(next.pickup_at_utc)}</Text>
                <Text style={styles.price}>{fmtMoney(next.total_price_minor, next.currency)}</Text>
              </View>

              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap to view details →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Pending jobs ── */}
        {bookings.slice(1).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 More Trips</Text>
            {bookings.slice(1).map((b: any) => (
              <TouchableOpacity
                key={b.id}
                style={styles.pendingCard}
                onPress={() => router.push(`/(app)/bookings/${b.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.jobHeader}>
                  <Text style={[styles.bookingNumber, { color: TEXT }]}>#{b.booking_reference}</Text>
                  <Text style={styles.vehicleClass}>{b.service_class_name ?? ''}</Text>
                </View>
                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={[styles.routeText, { color: SUB }]} numberOfLines={1}>{b.pickup_address_text}</Text>
                  </View>
                  {b.dropoff_address_text && (
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[styles.routeText, { color: SUB }]} numberOfLines={1}>{b.dropoff_address_text}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.jobFooter}>
                  <Text style={[styles.dateTime, { color: SUB }]}>📅 {fmtDateShort(b.pickup_at_utc)}</Text>
                  <Text style={[styles.price]}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Empty state ── */}
        {!isLoading && bookings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛣️</Text>
            <Text style={styles.emptyTitle}>No upcoming trips</Text>
            <Text style={styles.emptySubtitle}>Book your next luxury ride below</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/book')} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Book a Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header (1:1 ASDriver) ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  greeting:    { fontSize: 18, fontWeight: '700', color: TEXT },
  subGreeting: { fontSize: 13, color: SUB, marginTop: 2 },
  bookBtn: {
    backgroundColor: DARK,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { flex: 1 },
  section: { padding: 16 },

  // ── Section title (1:1 ASDriver) ──
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 12 },

  // ── Membership card ──
  memberCard: {
    backgroundColor: DARK,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  memberTier:     { fontSize: 20, fontWeight: '700', color: GOLD },
  memberDiscount: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  memberBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: GOLD + '25', alignItems: 'center', justifyContent: 'center',
  },
  memberBadgeText: { fontSize: 22, color: GOLD },

  // ── Active/upcoming job card (1:1 ASDriver activeJobCard — dark) ──
  activeJobCard: {
    backgroundColor: DARK,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingNumber: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '600' },
  vehicleClass: { fontSize: 12, color: MUTED, fontWeight: '600' },

  routeContainer: { gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  routeText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  price: { fontSize: 18, fontWeight: '700', color: GOLD },  // gold replaces ASDriver green

  tapHint: { alignItems: 'center' },
  tapHintText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },

  // ── Pending / secondary trip card (1:1 ASDriver pendingCard — white) ──
  pendingCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Empty state ──
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySubtitle: { fontSize: 14, color: SUB, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: {
    backgroundColor: DARK,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
