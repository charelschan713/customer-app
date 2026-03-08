import { useState, useRef } from 'react';
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
import { BG, CARD, TEXT, MUTED, BORDER, GOLD, SUCCESS, WARNING, ERROR, BLUE, fmtMoney, fmtDate } from '../../../src/lib/format';

// 1:1 web STATUS_CONFIG
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDING_CUSTOMER_CONFIRMATION: { label: 'Confirming',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
  AWAITING_CONFIRMATION:         { label: 'Confirming',  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
  CONFIRMED:                     { label: 'Confirmed',   color: '#34d399', bg: 'rgba(52,211,153,0.15)',  dot: '#34d399' },
  ASSIGNED:                      { label: 'Assigned',    color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  dot: '#60a5fa' },
  IN_PROGRESS:                   { label: 'Ongoing',     color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', dot: '#a78bfa' },
  COMPLETED:                     { label: 'Completed',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)',  dot: '#9ca3af' },
  CANCELLED:                     { label: 'Cancelled',   color: '#f87171', bg: 'rgba(248,113,113,0.15)', dot: '#f87171' },
  PAYMENT_FAILED:                { label: 'Pay Failed',  color: '#f87171', bg: 'rgba(248,113,113,0.15)', dot: '#f87171' },
};

const TABS = ['Upcoming', 'Past', 'All'] as const;
type Tab = typeof TABS[number];

function BookingCard({ booking: b, index }: { booking: any; index: number }) {
  const s = STATUS_CONFIG[b.status ?? b.operational_status] ??
    { label: (b.status ?? '').replace(/_/g,' '), color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', dot: '#9ca3af' };

  const anim  = useRef(new Animated.Value(0)).current;
  const oAnim = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 320, delay: index * 60, useNativeDriver: true }),
      Animated.timing(oAnim, { toValue: 1, duration: 320, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View style={{ opacity: oAnim, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(app)/bookings/${b.id}`); }}
        activeOpacity={0.75}
      >
        {/* Status dot + ref + badge */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.dot, { backgroundColor: s.dot }]} />
            <Text style={styles.ref}>{b.booking_reference}</Text>
            <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.color + '40' }]}>
              <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={MUTED + '60'} />
        </View>

        {/* Date */}
        <View style={[styles.rowLeft, { marginTop: 10 }]}>
          <Ionicons name="calendar-outline" size={12} color={MUTED} />
          <Text style={styles.meta}>{fmtDate(b.pickup_at_utc)}</Text>
        </View>

        {/* Pickup */}
        {b.pickup_address_text && (
          <View style={[styles.rowLeft, { marginTop: 6 }]}>
            <Ionicons name="location-outline" size={12} color={MUTED} />
            <Text style={styles.address} numberOfLines={1}>{b.pickup_address_text}</Text>
          </View>
        )}

        {/* Price */}
        {Number(b.total_price_minor) > 0 && (
          <Text style={styles.price}>{fmtMoney(b.total_price_minor, b.currency ?? 'AUD')}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

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

      {/* Header — 1:1 web sticky header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Bookings</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(app)/book'); }}
          >
            <Ionicons name="add" size={14} color={GOLD} />
            <Text style={styles.newBtnText}>New Booking</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs — 1:1 web Upcoming/Past/All */}
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} size="large" />
          </View>
        )}

        {!isLoading && bookings.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="car-outline" size={28} color={GOLD + '80'} />
            </View>
            <Text style={styles.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
            <Text style={styles.emptySub}>Your trips will appear here</Text>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => router.push('/(app)/book')}
            >
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.bookBtnText}>Book a Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && bookings.map((b: any, i: number) => (
          <BookingCard key={b.id} booking={b} index={i} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header:    { backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER, paddingHorizontal: 16, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title:     { fontSize: 18, fontWeight: '600', color: TEXT },
  newBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: GOLD + '20', borderWidth: 0.5, borderColor: GOLD + '4D' },
  newBtnText:{ fontSize: 12, fontWeight: '600', color: GOLD },

  // Tabs
  tabs:        { flexDirection: 'row' },
  tab:         { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', minWidth: 80, alignItems: 'center' },
  tabActive:   { borderBottomColor: GOLD },
  tabText:     { fontSize: 14, fontWeight: '500', color: MUTED + '59' },
  tabTextActive: { color: GOLD },

  // Card — 1:1 web: bg-white rounded-2xl border
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 10,
  },
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft:{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },

  dot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  ref:  { fontSize: 11, fontFamily: 'monospace', color: MUTED + '59', fontVariant: ['tabular-nums'] },
  badge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 0.5 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  meta:    { fontSize: 12, color: MUTED, marginLeft: 4 },
  address: { flex: 1, fontSize: 12, color: MUTED + 'B3', marginLeft: 4 },
  price:   { fontSize: 14, fontWeight: '700', color: GOLD, marginTop: 8 },

  // States
  center: { alignItems: 'center', paddingVertical: 60 },
  empty:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: GOLD + '14', borderWidth: 0.5, borderColor: GOLD + '2E', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:{ fontSize: 14, fontWeight: '600', color: MUTED },
  emptySub:  { fontSize: 12, color: MUTED + '66' },
  bookBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, backgroundColor: GOLD },
  bookBtnText:{ fontSize: 14, fontWeight: '600', color: '#000' },
});
