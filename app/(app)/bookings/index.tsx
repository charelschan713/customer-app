/**
 * My Bookings — 1:1 web portal /bookings page
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
import { BG, CARD, TEXT, MUTED, GOLD, SUCCESS, WARNING, ERROR, fmtMoney } from '../../../src/lib/format';

import { OP_STATUS_CONFIG } from '../../../src/lib/booking-status';

// ── Status config — derived from shared booking-status constants ───────────
// Mirrors bookings.operational_status backend real values (UPPERCASE)
const STATUS = OP_STATUS_CONFIG;

const TABS = ['Upcoming', 'Past', 'All'] as const;
type Tab = typeof TABS[number];

// ── Date format: "Mon, 23 Mar, 1:00 pm" (1:1 web portal) ─────────────────
function fmtBookingDate(dt: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Australia/Sydney',
  });
}

// ── Booking card — 1:1 web portal card ────────────────────────────────────
function BookingCard({ booking: b, index }: { booking: any; index: number }) {
  const status = b.status ?? b.operational_status ?? '';
  const s = STATUS[status] ?? { label: status.replace(/_/g, ' '), color: MUTED, bg: 'rgba(156,163,175,0.12)', dot: MUTED };

  const anim  = useRef(new Animated.Value(0)).current;
  const oAnim = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 320, delay: 80 + index * 60, useNativeDriver: true }),
      Animated.timing(oAnim, { toValue: 1, duration: 320, delay: 80 + index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View style={{ opacity: oAnim, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(app)/bookings/${b.id}`); }}
        activeOpacity={0.75}
      >
        {/* Row 1: status dot + ref + status badge + chevron */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={styles.ref}>{b.booking_reference}</Text>
            <View style={[styles.badge, { backgroundColor: s.bg }]}>
              <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={MUTED + '50'} />
        </View>

        {/* Row 2: calendar icon + date (web uses calendar, not clock) */}
        <View style={[styles.rowLeft, { marginTop: 10 }]}>
          <Ionicons name="calendar-outline" size={13} color={MUTED + '99'} />
          <Text style={styles.dateText}>{fmtBookingDate(b.pickup_at_utc)}</Text>
        </View>

        {/* Row 3: location pin + pickup address (web only shows pickup in list) */}
        {(b.pickup_address_text ?? b.pickup_address) && (
          <View style={[styles.rowLeft, { marginTop: 6 }]}>
            <Ionicons name="location-outline" size={13} color={MUTED + '99'} />
            <Text style={styles.addressText} numberOfLines={1}>
              {b.pickup_address_text ?? b.pickup_address}
            </Text>
          </View>
        )}

        {/* Row 4: price (gold, bold) */}
        {Number(b.total_price_minor) > 0 && (
          <Text style={styles.price}>{fmtMoney(b.total_price_minor, b.currency ?? 'AUD')}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {[120, '85%', '60%', 80].map((w, i) => (
        <View key={i} style={{ height: 12, backgroundColor: '#333355', borderRadius: 6, marginBottom: i < 3 ? 10 : 0, width: w as any }} />
      ))}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const [tab, setTab] = useState<Tab>('Upcoming');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => api.get('/customer-portal/bookings', {
      params: {
        status: tab === 'Upcoming' ? 'upcoming' : tab === 'Past' ? 'past' : undefined,
        limit: 50,
      },
    }).then(r => r.data),
    refetchInterval: 30000,
  });

  const bookings: any[] = data?.data ?? data ?? [];

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header — "My Bookings" + "+ New Booking" (1:1 web) */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/book'); }}>
          <Ionicons name="add" size={14} color={GOLD} />
          <Text style={styles.newBtnText}>New Booking</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs — Upcoming / Past / All with underline (1:1 web) */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={styles.tabBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}>
            <Text style={[styles.tabText, tab === t && styles.tabActive]}>{t}</Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {isLoading && [0, 1, 2].map(i => <SkeletonCard key={i} />)}

        {!isLoading && bookings.map((b, i) => <BookingCard key={b.id} booking={b} index={i} />)}

        {!isLoading && bookings.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="car-outline" size={28} color={GOLD + '80'} />
            </View>
            <Text style={styles.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
            <Text style={styles.emptySub}>Your trips will appear here</Text>
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
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:      { fontSize: 20, fontWeight: '600', color: TEXT },
  newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: GOLD + '20', borderWidth: 0.5, borderColor: GOLD + '4D' },
  newBtnText: { fontSize: 12, fontWeight: '600', color: GOLD },

  // Tabs
  tabs:        { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#333355', marginBottom: 8 },
  tabBtn:      { marginRight: 20, paddingVertical: 12, position: 'relative' },
  tabText:     { fontSize: 14, fontWeight: '500', color: MUTED + '70' },
  tabActive:   { color: GOLD, fontWeight: '600' },
  tabUnderline:{ position: 'absolute', bottom: -0.5, left: 0, right: 0, height: 2, backgroundColor: GOLD, borderRadius: 1 },

  // Card — 1:1 web: bg-[hsl(var(--card))] rounded-2xl, no border
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft:{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },

  // Status dot (left side, web: w-2.5 h-2.5 rounded-full)
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

  // Booking ref — web: text-[11px] font-mono text-white/35
  ref:  { fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)', fontVariant: ['tabular-nums'] },

  // Status badge — web: px-2 py-0.5 rounded-full text-[10px] font-semibold
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  // Date — web: text-xs text-gray-500
  dateText: { fontSize: 12, color: MUTED + 'B3', marginLeft: 2 },

  // Address — web: text-xs text-gray-400
  addressText: { flex: 1, fontSize: 12, color: MUTED + '99', marginLeft: 2 },

  // Price — web: text-sm font-semibold text-[hsl(var(--primary))]
  price: { fontSize: 15, fontWeight: '700', color: GOLD, marginTop: 8 },

  // Empty state
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: GOLD + '14', borderWidth: 0.5, borderColor: GOLD + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: MUTED },
  emptySub:   { fontSize: 12, color: MUTED + '66' },
  bookBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, backgroundColor: GOLD },
  bookBtnText:{ fontSize: 14, fontWeight: '600', color: '#000' },
});
