/**
 * My Bookings — 1:1 ASDriverNative JobsView style
 * "My Jobs" → "My Bookings", same card design, same tabs, same dots
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '../../../src/lib/api';
import { BG, CARD, TEXT, MUTED, GOLD, SUCCESS, WARNING, ERROR, fmtMoney, fmtDate } from '../../../src/lib/format';

// ── Status badge — 1:1 ASDriverNative statusColor ────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_CUSTOMER_CONFIRMATION: { label: 'Awaiting Payment', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  AWAITING_CONFIRMATION:         { label: 'Confirming',       color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  CONFIRMED:                     { label: 'Confirmed',        color: '#22C55E', bg: 'rgba(34,197,94,0.15)'  },
  ASSIGNED:                      { label: 'Assigned',         color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' },
  IN_PROGRESS:                   { label: 'In Progress',      color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  COMPLETED:                     { label: 'Completed',        color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  CANCELLED:                     { label: 'Cancelled',        color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
  PAYMENT_FAILED:                { label: 'Pay Failed',       color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
};

const TABS = ['Upcoming', 'In Progress', 'History'] as const;
type Tab = typeof TABS[number];

// ── Booking card — exact ASDriverNative EnhancedJobCard ───────────────────
function BookingCard({ booking: b, index }: { booking: any; index: number }) {
  const status = b.operational_status ?? b.status ?? '';
  const s = STATUS[status] ?? { label: status.replace(/_/g, ' '), color: MUTED, bg: 'rgba(156,163,175,0.12)' };

  const anim  = useRef(new Animated.Value(0)).current;
  const oAnim = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 350, delay: 100 + index * 70, useNativeDriver: true }),
      Animated.timing(oAnim, { toValue: 1, duration: 350, delay: 100 + index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={{ opacity: oAnim, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(app)/bookings/${b.id}`);
        }}
        activeOpacity={0.75}
      >
        {/* Row 1: booking ref (gold monospace) + status badge */}
        <View style={styles.row}>
          <Text style={styles.ref}>{b.booking_reference}</Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>

        {/* Row 2: clock icon (gold) + date/time bold white */}
        <View style={[styles.rowLeft, { marginTop: 12 }]}>
          <Ionicons name="time" size={15} color={GOLD + 'B3'} />
          <Text style={styles.dateText}>{fmtDate(b.pickup_at_utc)}</Text>
        </View>

        {/* Row 3: route dots — gold pickup, green dropoff */}
        <View style={{ marginTop: 12, gap: 8 }}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: GOLD }]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {b.pickup_address_text ?? b.pickup_address ?? '—'}
            </Text>
          </View>
          {(b.dropoff_address_text ?? b.dropoff_address) && (
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: SUCCESS }]} />
              <Text style={styles.addressText} numberOfLines={1}>
                {b.dropoff_address_text ?? b.dropoff_address}
              </Text>
            </View>
          )}
        </View>

        {/* Row 4: car icon + vehicle name + chevron */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="car-outline" size={12} color={MUTED + '80'} />
            <Text style={styles.vehicleText}>
              {b.car_type_name ?? b.service_class_name ?? ''}
            </Text>
          </View>
          <View style={styles.rowLeft}>
            {Number(b.total_price_minor) > 0 && (
              <Text style={styles.priceText}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
            )}
            <Ionicons name="chevron-forward" size={14} color={MUTED + '50'} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────
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
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {[100, '100%', '80%', '60%'].map((w, i) => (
        <View key={i} style={{ height: 12, backgroundColor: '#333355', borderRadius: 6, marginBottom: i < 3 ? 12 : 0, width: w as any }} />
      ))}
    </Animated.View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const [tab, setTab] = useState<Tab>('Upcoming');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => api.get('/customer-portal/bookings', {
      params: {
        status: tab === 'Upcoming' ? 'upcoming' : tab === 'In Progress' ? 'in_progress' : 'past',
        limit: 50,
      },
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const bookings: any[] = data?.data ?? data ?? [];

  return (
    <SafeAreaView style={styles.safe}>

      {/* Large title — "My Jobs" style */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/book'); }}
        >
          <Ionicons name="add" size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* Tabs — Upcoming / In Progress / History (ASDriverNative style underline) */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={styles.tabBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {/* Skeleton */}
        {isLoading && [0, 1, 2].map(i => <SkeletonCard key={i} />)}

        {/* Cards */}
        {!isLoading && bookings.map((b: any, i: number) => (
          <BookingCard key={b.id} booking={b} index={i} />
        ))}

        {/* Empty */}
        {!isLoading && bookings.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={52} color={MUTED + '50'} />
            <Text style={styles.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
            <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(app)/book')}>
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.bookBtnText}>Book a Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Header — large title (ASDriverNative)
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:    { fontSize: 32, fontWeight: '700', color: TEXT },
  newBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: GOLD + '20', alignItems: 'center', justifyContent: 'center' },

  // Tabs — underline style (ASDriverNative)
  tabs:           { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#333355', marginBottom: 8 },
  tabBtn:         { marginRight: 24, paddingBottom: 12, position: 'relative' },
  tabText:        { fontSize: 14, fontWeight: '500', color: MUTED + '80' },
  tabTextActive:  { color: GOLD, fontWeight: '600' },
  tabUnderline:   { position: 'absolute', bottom: -0.5, left: 0, right: 0, height: 2, backgroundColor: GOLD, borderRadius: 1 },

  // Card — ASDriverNative: bg brandCard, cornerRadius 12, NO visible border (shadow only)
  card: {
    backgroundColor: CARD,       // #222236
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Subtle shadow instead of border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Booking ref — gold monospaced (ASDriverNative)
  ref:       { fontSize: 12, fontWeight: '600', color: GOLD, fontVariant: ['tabular-nums'] },

  // Status badge — no border, just bg opacity
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Date — clock + bold white (ASDriverNative)
  dateText:  { fontSize: 17, fontWeight: '700', color: TEXT, marginLeft: 4 },

  // Route — gold + green dots (ASDriverNative)
  routeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  addressText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Vehicle + price
  vehicleText: { fontSize: 12, color: MUTED + '99' },
  priceText:   { fontSize: 14, fontWeight: '700', color: GOLD },

  // Empty
  empty:     { alignItems: 'center', paddingVertical: 80, gap: 14 },
  emptyTitle:{ fontSize: 15, color: MUTED },
  bookBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, backgroundColor: GOLD },
  bookBtnText:{ fontSize: 14, fontWeight: '700', color: '#000' },
});
