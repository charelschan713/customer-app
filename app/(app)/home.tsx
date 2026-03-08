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
import { BG, CARD, BORDER, TEXT, SUB, GOLD, SUCCESS, WARNING, ERROR, BLUE, fmtMoney, fmtDate } from '../../src/lib/format';

const LOCAL_LOGO = require('../../assets/logo.png');

// 1:1 ASDriverNative statusColor / statusLabel
const STATUS: Record<string, { label: string; color: string }> = {
  CONFIRMED:                     { label: 'Confirmed',        color: SUCCESS },
  PENDING_CUSTOMER_CONFIRMATION: { label: 'Awaiting Payment', color: WARNING },
  ASSIGNED:                      { label: 'Assigned',         color: '#9CA3AF' },
  IN_PROGRESS:                   { label: 'In Progress',      color: BLUE },
  COMPLETED:                     { label: 'Completed',        color: '#9CA3AF' },
  CANCELLED:                     { label: 'Cancelled',        color: ERROR },
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
    refetchInterval: 30000,
  });

  const upcoming = allBookings.filter((b: any) => !['COMPLETED', 'CANCELLED'].includes(b.operational_status));
  const past     = allBookings.filter((b: any) =>  ['COMPLETED', 'CANCELLED'].includes(b.operational_status));
  const firstName = profile?.first_name ?? user?.first_name ?? 'Driver';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Navigation bar — large title style (ASDriverNative) ── */}
      <View style={styles.navBar}>
        <Image source={LOCAL_LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.navRight}>
          {profile?.tier && profile.tier !== 'STANDARD' && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{profile.tier}</Text>
            </View>
          )}
          {profile?.discount_rate > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{Number(profile.discount_rate).toFixed(0)}% OFF</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{(firstName[0] ?? '?').toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Large title (ASDriverNative .navigationBarTitleDisplayMode(.large)) */}
      <View style={styles.pageTitleWrap}>
        <Text style={styles.pageTitle}>Welcome, {firstName}</Text>
        <Text style={styles.pageSubtitle}>Your upcoming trips</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />}
      >
        {isLoading && <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 40 }} />}

        {upcoming.map((b: any) => (
          <BookingCard key={b.id} booking={b} onPress={() => router.push(`/(app)/bookings/${b.id}`)} />
        ))}

        {past.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>History</Text>
            {past.map((b: any) => (
              <BookingCard key={b.id} booking={b} onPress={() => router.push(`/(app)/bookings/${b.id}`)} />
            ))}
          </>
        )}

        {!isLoading && allBookings.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={44} color={SUB} />
            <Text style={styles.emptyText}>No trips yet</Text>
            <Text style={styles.emptySub}>Tap Book to get started</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Booking card — 1:1 ASDriverNative EnhancedJobCard ────────────────────────
function BookingCard({ booking: b, onPress }: { booking: any; onPress: () => void }) {
  const s = STATUS[b.operational_status] ?? { label: b.operational_status ?? '', color: SUB };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Row 1: booking ref + status badge */}
      <View style={styles.row}>
        <Text style={styles.bookingRef}>{b.booking_reference}</Text>
        <View style={[styles.statusBadge, { backgroundColor: s.color + '20' }]}>
          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Row 2: date */}
      <View style={[styles.row, { marginTop: 8 }]}>
        <Ionicons name="time-outline" size={13} color={SUB} />
        <Text style={styles.dateText}>{fmtDate(b.pickup_at_utc)}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Route: pickup */}
      <View style={styles.routeRow}>
        <View style={[styles.routeDot, { backgroundColor: GOLD }]} />
        <Text style={styles.routeText} numberOfLines={1}>{b.pickup_address_text ?? '—'}</Text>
      </View>
      {/* Route: dropoff */}
      {b.dropoff_address_text ? (
        <View style={[styles.routeRow, { marginTop: 8 }]}>
          <View style={[styles.routeDot, { backgroundColor: SUCCESS }]} />
          <Text style={styles.routeText} numberOfLines={1}>{b.dropoff_address_text}</Text>
        </View>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Row 3: vehicle + price + chevron */}
      <View style={styles.row}>
        <View style={styles.vehicleWrap}>
          <Ionicons name="car-outline" size={14} color={SUB} />
          <Text style={styles.vehicleText}>{b.car_type_name ?? b.service_class_name ?? '—'}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.priceText}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
          <Ionicons name="chevron-forward" size={15} color={SUB} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },

  // Nav bar
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  logo:        { width: 150, height: 26 },
  navRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierBadge:   { backgroundColor: GOLD, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tierText:    { fontSize: 10, fontWeight: '700', color: '#1A1A2E' },
  discountBadge: { backgroundColor: WARNING + '25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: WARNING + '50' },
  discountText:  { fontSize: 10, fontWeight: '700', color: WARNING },
  avatarBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  // Large title (ASDriverNative .navigationBarTitleDisplayMode(.large))
  pageTitleWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  pageTitle:   { fontSize: 32, fontWeight: '700', color: TEXT },
  pageSubtitle:{ fontSize: 15, color: SUB, marginTop: 2 },

  sectionHeader: {
    fontSize: 20, fontWeight: '700', color: TEXT,
    marginTop: 20, marginBottom: 12,
  },

  // Card — .cardStyle() = brandCard + cornerRadius 12 + border 0.5 brandCardBorder
  card: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  bookingRef:  { fontSize: 15, fontWeight: '600', color: GOLD },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 12, fontWeight: '600' },

  dateText: { fontSize: 13, color: SUB, marginLeft: 5, flex: 1 },

  divider: { height: 0.5, backgroundColor: BORDER, marginVertical: 10 },

  routeRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  routeText: { flex: 1, fontSize: 14, color: TEXT, lineHeight: 20 },

  vehicleWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vehicleText: { fontSize: 13, color: SUB },
  priceWrap:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText:   { fontSize: 16, fontWeight: '700', color: GOLD },

  empty:     { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: '600', color: SUB },
  emptySub:  { fontSize: 14, color: '#6B7280' },
});
