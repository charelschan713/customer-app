import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, RefreshControl, ActivityIndicator, Animated,
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

// 1:1 ASDriverNative statusColor + statusLabel
const STATUS: Record<string, { label: string; color: string }> = {
  CONFIRMED:                     { label: 'Confirmed',        color: SUCCESS },
  PENDING_CUSTOMER_CONFIRMATION: { label: 'Awaiting Payment', color: WARNING },
  ASSIGNED:                      { label: 'Assigned',         color: '#9CA3AF' },
  IN_PROGRESS:                   { label: 'In Progress',      color: BLUE },
  COMPLETED:                     { label: 'Completed',        color: '#9CA3AF' },
  CANCELLED:                     { label: 'Cancelled',        color: ERROR },
};

// ── Animated booking card — 1:1 ASDriverNative EnhancedJobCard ─────────────
function BookingCard({ booking: b, index, onPress }: { booking: any; index: number; onPress: () => void }) {
  const s = STATUS[b.operational_status] ?? { label: b.operational_status ?? '', color: '#9CA3AF' };

  // Enter animation: offset y:10→0 + opacity:0→1, staggered (ASDriverNative pattern)
  const anim   = useRef(new Animated.Value(0)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: 200 + index * 70,   // 0.2 + index * 0.07 (ASDriverNative)
        useNativeDriver: true,
      }),
      Animated.timing(opacAnim, {
        toValue: 1,
        duration: 350,
        delay: 200 + index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // ASDriverNative haptic
    onPress();
  };

  return (
    <Animated.View style={{ opacity: opacAnim, transform: [{ translateY }] }}>
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.75}>

        {/* Row 1: Booking ref (monospaced, gold 0.8) + status pill with gradient border */}
        <View style={styles.row}>
          <Text style={styles.bookingRef}>{b.booking_reference}</Text>
          <View style={[styles.statusWrap, { backgroundColor: s.color + '1A' }]}>
            {/* gradient border effect via two nested views */}
            <View style={[styles.statusBorderTop, { borderColor: s.color + '66' }]} />
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
        </View>

        {/* Row 2: clock.fill (gold 0.7) + time (16px semibold white) */}
        <View style={[styles.rowLeft, { marginTop: 14 }]}>
          <Ionicons name="time" size={13} color={GOLD + 'B3'} />
          <Text style={styles.dateText}>{fmtDate(b.pickup_at_utc)}</Text>
        </View>

        {/* Row 3: Route — gold dot + 0.5pt vertical line + green dot */}
        <View style={{ marginTop: 14 }}>
          {/* Pickup */}
          <View style={styles.routeRow}>
            <View style={styles.routeConnector}>
              <View style={[styles.routeDot, { backgroundColor: GOLD, shadowColor: GOLD }]} />
              <View style={styles.routeLine} />
            </View>
            <Text style={styles.routeText} numberOfLines={2}>{b.pickup_address_text ?? '—'}</Text>
          </View>
          {/* Dropoff */}
          <View style={styles.routeRow}>
            <View style={styles.routeConnector}>
              <View style={[styles.routeDot, { backgroundColor: SUCCESS, shadowColor: SUCCESS }]} />
            </View>
            <Text style={styles.routeText} numberOfLines={2}>{b.dropoff_address_text ?? '—'}</Text>
          </View>
        </View>

        {/* Row 4: vehicle + chevron */}
        <View style={[styles.row, { marginTop: 14 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="car" size={11} color={MUTED + '99'} />
            <Text style={styles.vehicleText}>{b.car_type_name ?? b.service_class_name ?? ''}</Text>
          </View>
          <View style={styles.rowLeft}>
            <Text style={styles.priceText}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
            <Ionicons name="chevron-forward" size={12} color={MUTED + '59'} />
          </View>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Skeleton card (shimmer placeholder while loading) ─────────────────────
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
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.75] });
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {[140, 180, '100%', '100%'].map((w, i) => (
        <View key={i} style={{ height: 13, backgroundColor: BORDER, borderRadius: 6, marginBottom: i < 3 ? 14 : 0, width: w as any }} />
      ))}
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
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
    refetchInterval: 30000,
  });

  const upcoming = allBookings.filter((b: any) => !['COMPLETED', 'CANCELLED'].includes(b.operational_status));
  const past     = allBookings.filter((b: any) =>  ['COMPLETED', 'CANCELLED'].includes(b.operational_status));
  const firstName = profile?.first_name ?? user?.first_name ?? 'Guest';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — logo + badges + avatar (gold circle like ASDriverNative) */}
      <View style={styles.navBar}>
        <Image source={LOCAL_LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.navRight}>
          {profile?.tier && profile.tier !== 'STANDARD' && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{profile.tier}</Text>
            </View>
          )}
          {Number(profile?.discount_rate) > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{Number(profile.discount_rate).toFixed(0)}% OFF</Text>
            </View>
          )}
          {/* Gold circle avatar (1:1 ASDriverNative Circle.fill(.brandGold)) */}
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(app)/profile')} activeOpacity={0.8}>
            <Text style={styles.avatarText}>{(firstName[0] ?? '?').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Large title (ASDriverNative .navigationBarTitleDisplayMode(.large)) */}
      <View style={styles.pageTitleWrap}>
        <Text style={styles.pageTitle}>{firstName}</Text>
        <Text style={styles.pageSubtitle}>Welcome back</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {/* Skeleton while loading (ASDriverNative SkeletonJobCard) */}
        {isLoading && [0, 1].map(i => <SkeletonCard key={i} />)}

        {/* Upcoming */}
        {!isLoading && upcoming.map((b: any, i: number) => (
          <BookingCard key={b.id} booking={b} index={i} onPress={() => router.push(`/(app)/bookings/${b.id}`)} />
        ))}

        {/* Past section header */}
        {!isLoading && past.length > 0 && (
          <Text style={styles.sectionHeader}>History</Text>
        )}

        {!isLoading && past.map((b: any, i: number) => (
          <BookingCard key={b.id} booking={b} index={upcoming.length + i} onPress={() => router.push(`/(app)/bookings/${b.id}`)} />
        ))}

        {/* Empty state */}
        {!isLoading && allBookings.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={44} color={MUTED + '66'} />
            <Text style={styles.emptyText}>No upcoming trips</Text>
            <Text style={styles.emptySub}>Tap Book to get started</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 4 },

  // Nav bar (1:1 ASDriverNative DashboardView headerSection)
  navBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  logo:      { width: 150, height: 26 },
  navRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadge: { backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tierText:  { fontSize: 11, fontWeight: '700', color: '#1A1A2E' },
  discountBadge: { backgroundColor: WARNING + '25', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5, borderColor: WARNING + '66' },
  discountText:  { fontSize: 11, fontWeight: '700', color: WARNING },
  // Gold circle (ASDriverNative: Circle.fill(.brandGold))
  avatarBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },

  // Large title (font: .system(size: 24, weight: .bold) = TEXT)
  pageTitleWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  pageTitle:     { fontSize: 32, fontWeight: '700', color: TEXT },
  pageSubtitle:  { fontSize: 13, color: SUB + '99', marginTop: 2 },

  sectionHeader: { fontSize: 18, fontWeight: '700', color: TEXT, marginTop: 8, marginBottom: 16 },

  // ── EnhancedJobCard ────────────────────────────────────────────────
  // .cardStyle() = backgroundColor(.brandCard), cornerRadius(12), stroke(.brandCardBorder, 0.5)
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 14,
  },

  row:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Booking ref: font(.system(size:12, weight:.semibold, design:.monospaced)), color(.brandGold.opacity(0.8))
  bookingRef: { fontSize: 12, fontWeight: '600', color: GOLD + 'CC', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },

  // Status badge: background(color.opacity(0.1)), overlay stroke LinearGradient 0.5, cornerRadius 8, shadow
  statusWrap: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, position: 'relative',
    borderWidth: 0.5,
  },
  statusBorderTop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Time: clock.fill gold, text 16 semibold white
  dateText: { fontSize: 16, fontWeight: '600', color: TEXT, marginLeft: 2 },

  // Route
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 0 },
  routeConnector: { alignItems: 'center', width: 7 },
  routeDot: {
    width: 7, height: 7, borderRadius: 3.5,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2,
  },
  routeLine: { width: 0.5, height: 24, backgroundColor: BORDER + '66', marginTop: 2 },
  routeText: { flex: 1, fontSize: 13, color: TEXT + 'BF', lineHeight: 20 }, // white.opacity(0.75)

  // Vehicle + price
  vehicleText: { fontSize: 11, color: MUTED + '99' },
  priceText:   { fontSize: 15, fontWeight: '700', color: GOLD },

  // Empty
  empty:     { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 15, color: MUTED + 'B3' },
  emptySub:  { fontSize: 13, color: '#6B7280' },
});
