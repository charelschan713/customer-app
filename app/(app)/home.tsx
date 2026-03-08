import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../src/lib/api';
import { getStoredUser } from '../../src/lib/auth';
import { BG, CARD, BORDER, TEXT, SUB, MUTED, GOLD, SUCCESS, WARNING, ERROR, BLUE, fmtMoney, fmtDate } from '../../src/lib/format';

const LOCAL_LOGO = require('../../assets/logo.png');

// ── Status badge — matches web StatusBadge ─────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED:                     { label: 'Confirmed',        color: '#166534', bg: '#dcfce7' },
  PENDING_CUSTOMER_CONFIRMATION: { label: 'Awaiting Payment', color: '#92400e', bg: '#fef3c7' },
  PENDING:                       { label: 'Pending',          color: '#92400e', bg: '#fef3c7' },
  ASSIGNED:                      { label: 'Driver Assigned',  color: '#1e40af', bg: '#dbeafe' },
  IN_PROGRESS:                   { label: 'In Progress',      color: '#5b21b6', bg: '#ede9fe' },
  COMPLETED:                     { label: 'Completed',        color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED:                     { label: 'Cancelled',        color: '#991b1b', bg: '#fee2e2' },
  NO_SHOW:                       { label: 'No Show',          color: '#991b1b', bg: '#fee2e2' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status?.replace(/_/g, ' ') ?? '', color: '#6b7280', bg: '#f3f4f6' };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

// ── Dark booking card — 1:1 web DarkBookingCard (upcoming) ─────────────────
function DarkCard({ booking: b, index, onPress }: { booking: any; index: number; onPress: () => void }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const oAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 350, delay: 150 + index * 70, useNativeDriver: true }),
      Animated.timing(oAnim, { toValue: 1, duration: 350, delay: 150 + index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={{ opacity: oAnim, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={styles.darkCard}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        activeOpacity={0.75}
      >
        {/* Row 1: booking ref + status */}
        <View style={styles.row}>
          <Text style={styles.bookingRef}>{b.booking_reference}</Text>
          <StatusBadge status={b.operational_status ?? b.status} />
        </View>

        {/* Row 2: Route — green pickup, red dropoff (web layout) */}
        <View style={{ marginTop: 14, gap: 8 }}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#34d399' }]} />
            <Text style={styles.darkRouteText} numberOfLines={1}>
              {b.pickup_address_text ?? b.pickup_address ?? '—'}
            </Text>
          </View>
          {(b.dropoff_address_text ?? b.dropoff_address) && (
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#f87171' }]} />
              <Text style={styles.darkRouteText} numberOfLines={1}>
                {b.dropoff_address_text ?? b.dropoff_address}
              </Text>
            </View>
          )}
        </View>

        {/* Row 3: time + price */}
        <View style={[styles.row, { marginTop: 14 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.darkTimeText}>{fmtDate(b.pickup_at_utc)}</Text>
          </View>
          <View style={styles.rowLeft}>
            {Number(b.total_price_minor) > 0 && (
              <Text style={styles.goldPrice}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
            )}
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Light booking card — 1:1 web LightBookingCard (past) ───────────────────
function LightCard({ booking: b, index, onPress }: { booking: any; index: number; onPress: () => void }) {
  const anim  = useRef(new Animated.Value(0)).current;
  const oAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 350, delay: 200 + index * 70, useNativeDriver: true }),
      Animated.timing(oAnim, { toValue: 1, duration: 350, delay: 200 + index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View style={{ opacity: oAnim, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={styles.lightCard}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        activeOpacity={0.75}
      >
        {/* Row 1: booking ref + status */}
        <View style={styles.row}>
          <Text style={styles.lightBookingRef}>{b.booking_reference}</Text>
          <StatusBadge status={b.operational_status ?? b.status} />
        </View>

        {/* Row 2: Route */}
        <View style={{ marginTop: 12, gap: 8 }}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#34d399' }]} />
            <Text style={styles.lightRouteText} numberOfLines={1}>
              {b.pickup_address_text ?? b.pickup_address ?? '—'}
            </Text>
          </View>
          {(b.dropoff_address_text ?? b.dropoff_address) && (
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#f87171' }]} />
              <Text style={styles.lightRouteText} numberOfLines={1}>
                {b.dropoff_address_text ?? b.dropoff_address}
              </Text>
            </View>
          )}
        </View>

        {/* Row 3: time + price */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
            <Text style={styles.lightTimeText}>{fmtDate(b.pickup_at_utc)}</Text>
          </View>
          <View style={styles.rowLeft}>
            {Number(b.total_price_minor) > 0 && (
              <Text style={styles.darkPrice}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
            )}
            <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] });
  return (
    <Animated.View style={[styles.darkCard, { opacity }]}>
      {[120, '100%', '80%'].map((w, i) => (
        <View key={i} style={{ height: 12, backgroundColor: BORDER, borderRadius: 6, marginBottom: i < 2 ? 12 : 0, width: w as any }} />
      ))}
    </Animated.View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { getStoredUser().then(setUser); }, []);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => { const res = await api.get('/customer-portal/profile'); return res.data; },
  });

  const { data: dashData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const res = await api.get('/customer-portal/dashboard');
        return res.data;
      } catch {
        // Fallback to bookings endpoint
        const res = await api.get('/customer-portal/bookings', { params: { limit: 20 } });
        const all = res.data?.data ?? res.data ?? [];
        const upcoming = all.filter((b: any) => !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.operational_status));
        const past     = all.filter((b: any) =>  ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.operational_status));
        return { upcoming, past, customer: null };
      }
    },
    refetchInterval: 30000,
  });

  const { upcoming = [], past = [], customer } = dashData ?? {};
  const firstName = customer?.first_name ?? profile?.first_name ?? user?.first_name ?? 'there';
  const tier = customer?.tier ?? profile?.tier;
  const discountRate = customer?.discount_rate ?? profile?.discount_rate;

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header — 1:1 web DashboardClient header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Image source={LOCAL_LOGO} style={styles.logo} resizeMode="contain" />
          {/* "Welcome back, {name}" + badges */}
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomeText}>Welcome back, {firstName}</Text>
            {tier && tier !== 'STANDARD' && (
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{tier}</Text>
              </View>
            )}
            {Number(discountRate) > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{Number(discountRate).toFixed(0)}% OFF</Text>
              </View>
            )}
          </View>
        </View>
        {/* Avatar — gold circle (ASDriver) */}
        <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(app)/profile')} activeOpacity={0.8}>
          <Text style={styles.avatarText}>{(firstName[0] ?? '?').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {/* Skeleton */}
        {isLoading && [0, 1].map(i => <SkeletonCard key={i} />)}

        {/* Upcoming — dark cards (web: DarkBookingCard) */}
        {!isLoading && upcoming.map((b: any, i: number) => (
          <DarkCard key={b.id} booking={b} index={i} onPress={() => router.push(`/(app)/bookings/${b.id}`)} />
        ))}

        {/* Past section — "Past Trips" header + light cards (web: LightBookingCard) */}
        {!isLoading && past.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Past Trips</Text>
            {past.map((b: any, i: number) => (
              <LightCard key={b.id} booking={b} index={i} onPress={() => router.push(`/(app)/bookings/${b.id}`)} />
            ))}
          </>
        )}

        {/* Empty state */}
        {!isLoading && upcoming.length === 0 && past.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>🛣️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySub}>Tap Book to get started</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // ── Header (sticky, 1:1 web header) ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: BG,
  },
  logo: { width: 160, height: 24, marginBottom: 6 },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  welcomeText: { fontSize: 12, color: '#9CA3AF' },
  tierBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  tierText:  { fontSize: 10, fontWeight: '700', color: '#fff' },
  discountBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  discountText:  { fontSize: 10, fontWeight: '700', color: '#92400e' },
  // Gold circle avatar
  avatarBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 2,
    marginTop: 8, marginBottom: 12,
  },

  // ── Dark card (upcoming) — ASDriver brandDark #1A1A2E ──────────────────
  darkCard: {
    backgroundColor: BG,           // #1A1A2E — same as page bg, use border for definition
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,           // #333355
  },

  // ── Light card (past) — ASDriver CARD colour, slightly lighter than bg ──
  lightCard: {
    backgroundColor: CARD,          // #222236
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: BORDER,             // #333355
  },

  // Shared row helpers
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft:{ flexDirection: 'row', alignItems: 'center', gap: 5 },

  // Status badge
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // Booking refs
  bookingRef:      { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], color: '#fff' },
  lightBookingRef: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], color: '#fff' },

  // Route
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  darkRouteText:  { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  lightRouteText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Times
  darkTimeText:  { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 2 },
  lightTimeText: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 2 },

  // Prices
  goldPrice: { fontSize: 15, fontWeight: '700', color: GOLD },
  darkPrice: { fontSize: 15, fontWeight: '700', color: GOLD },

  // Empty state
  empty:     { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle:{ fontSize: 16, fontWeight: '700', color: TEXT },
  emptySub:  { fontSize: 13, color: MUTED },
});
