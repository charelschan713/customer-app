import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/lib/api';
import { BG, CARD, DARK, TEXT, SUB, MUTED, BORDER, GOLD, fmtMoney, fmtDateShort } from '../../../src/lib/format';

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#22c55e', PENDING_CUSTOMER_CONFIRMATION: '#f59e0b',
  COMPLETED: '#8b5cf6', CANCELLED: '#ef4444', IN_PROGRESS: '#3b82f6', ASSIGNED: '#3b82f6',
};

export default function BookingsScreen() {
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/bookings');
      return res.data?.data ?? res.data ?? [];
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={DARK} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header (1:1 ASDriver) */}
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(app)/book')} activeOpacity={0.85}>
          <Text style={styles.newBtnText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={DARK} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {bookings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛣️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Book your first luxury ride</Text>
          </View>
        )}
        {bookings.map((b: any) => {
          const color = STATUS_COLOR[b.operational_status] ?? '#888';
          return (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              onPress={() => router.push(`/(app)/bookings/${b.id}`)}
              activeOpacity={0.85}
            >
              {/* Card header */}
              <View style={styles.cardTop}>
                <Text style={styles.ref}>{b.booking_reference}</Text>
                <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>
                    {b.operational_status?.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              {/* Route */}
              <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.addr} numberOfLines={1}>{b.pickup_address_text}</Text>
                </View>
                {b.dropoff_address_text && (
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.addr} numberOfLines={1}>{b.dropoff_address_text}</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="time-outline" size={12} color={MUTED} />
                  <Text style={styles.date}>{fmtDateShort(b.pickup_at_utc)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.amount}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={MUTED} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header (1:1 ASDriver)
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  title:      { fontSize: 20, fontWeight: '700', color: TEXT },
  newBtn:     { backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  scroll: { flex: 1 },

  // Card (1:1 ASDriver pendingCard)
  card: {
    backgroundColor: CARD,
    borderRadius: 16, padding: 16, marginBottom: 12, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref:     { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '600' },

  routeContainer: { gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  addr: { flex: 1, fontSize: 13, color: SUB, lineHeight: 18 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  date:   { fontSize: 12, color: MUTED },
  amount: { fontSize: 16, fontWeight: '700', color: GOLD },  // gold = ASDriver green

  emptyState:    { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySubtitle: { fontSize: 14, color: SUB },
});
