import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { getStoredUser } from '../../src/lib/auth';
import { BG, CARD, DARK, TEXT, SUB, MUTED, BORDER, GOLD, fmtMoney, fmtDateShort } from '../../src/lib/format';

// Must match MEMORY — transparent logo
const LOCAL_LOGO = require('../../assets/logo.png');

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:                     '#22c55e',
  PENDING_CUSTOMER_CONFIRMATION: '#f59e0b',
  COMPLETED:                     '#8b5cf6',
  CANCELLED:                     '#ef4444',
  IN_PROGRESS:                   '#3b82f6',
  ASSIGNED:                      '#3b82f6',
};

const TIER_BG: Record<string, string> = {
  VIP:      '#1a1a1a',
  PLATINUM: '#7c3aed',
  GOLD:     '#b45309',
  SILVER:   '#374151',
};

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { getStoredUser().then(setUser); }, []);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => { const res = await api.get('/customer-portal/profile'); return res.data; },
  });

  const { data: allBookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'home'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/bookings', { params: { limit: 10 } });
      return res.data?.data ?? res.data ?? [];
    },
  });

  // Split upcoming vs past
  const upcoming = allBookings.filter((b: any) =>
    !['COMPLETED', 'CANCELLED'].includes(b.operational_status)
  );
  const past = allBookings.filter((b: any) =>
    ['COMPLETED', 'CANCELLED'].includes(b.operational_status)
  );

  const displayName = profile?.first_name ?? user?.first_name ?? 'Guest';
  const tier = profile?.tier;
  const discountRate = profile?.discount_rate;
  const hasDiscount = discountRate && Number(discountRate) > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DARK} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header — Logo + Welcome + Badges + Avatar ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Image source={LOCAL_LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeText}>Welcome back, {displayName}</Text>
            {tier && tier !== 'STANDARD' && (
              <View style={[styles.tierBadge, { backgroundColor: TIER_BG[tier] ?? '#1a1a1a' }]}>
                <Text style={styles.tierText}>{tier}</Text>
              </View>
            )}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{Number(discountRate).toFixed(0)}% OFF</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(app)/profile')}>
          <Ionicons name="person-outline" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={DARK} />}
      >
        {/* ── Upcoming trips ── */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            {upcoming.map((b: any, i: number) => (
              <TouchableOpacity
                key={b.id}
                style={styles.darkCard}
                onPress={() => router.push(`/(app)/bookings/${b.id}`)}
                activeOpacity={0.85}
              >
                {/* Card header */}
                <View style={styles.cardTop}>
                  <Text style={styles.refDark}>{b.booking_reference}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[b.operational_status] ?? '#888') + '30' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[b.operational_status] ?? '#888' }]}>
                      {b.operational_status?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.routeTextDark} numberOfLines={1}>{b.pickup_address_text}</Text>
                  </View>
                  {b.dropoff_address_text && (
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={styles.routeTextDark} numberOfLines={1}>{b.dropoff_address_text}</Text>
                    </View>
                  )}
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.dateDark}>{fmtDateShort(b.pickup_at_utc)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.priceDark}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Past trips ── */}
        {past.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAST TRIPS</Text>
            {past.map((b: any) => (
              <TouchableOpacity
                key={b.id}
                style={styles.lightCard}
                onPress={() => router.push(`/(app)/bookings/${b.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.refLight}>{b.booking_reference}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[b.operational_status] ?? '#888') + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[b.operational_status] ?? '#888' }]}>
                      {b.operational_status?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.routeTextLight} numberOfLines={1}>{b.pickup_address_text}</Text>
                  </View>
                  {b.dropoff_address_text && (
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={styles.routeTextLight} numberOfLines={1}>{b.dropoff_address_text}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={12} color={MUTED} />
                    <Text style={styles.dateLight}>{fmtDateShort(b.pickup_at_utc)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.priceLight}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={MUTED} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Empty state ── */}
        {!isLoading && allBookings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛣️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to book your first luxury ride</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  logo: { width: 160, height: 28 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  welcomeText: { fontSize: 13, color: SUB },
  tierBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  discountBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, backgroundColor: '#fef3c7',
  },
  discountText: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 10,
  },

  scroll: { flex: 1 },
  section: { padding: 16, gap: 12 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: MUTED,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 4,
  },

  // ── Dark card (upcoming) ──
  darkCard: {
    backgroundColor: DARK,
    borderRadius: 16, padding: 16, gap: 12,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refDark:    { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'monospace' },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },

  routeContainer: { gap: 8 },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDot:       { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  routeTextDark:  { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateDark:   { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  priceDark:  { fontSize: 17, fontWeight: '700', color: GOLD },

  // ── Light card (past) ──
  lightCard: {
    backgroundColor: CARD,
    borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  refLight:        { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'monospace' },
  routeTextLight:  { flex: 1, fontSize: 13, color: SUB, lineHeight: 18 },
  dateLight:       { fontSize: 12, color: MUTED },
  priceLight:      { fontSize: 16, fontWeight: '700', color: TEXT },

  // ── Empty state ──
  emptyState:    { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySubtitle: { fontSize: 14, color: SUB, textAlign: 'center', paddingHorizontal: 40 },
});
