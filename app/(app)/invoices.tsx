import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { BG, CARD, DARK, TEXT, SUB, MUTED, BORDER, GOLD, fmtMoney, fmtDateShort } from '../../src/lib/format';

export default function InvoicesScreen() {
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/bookings', { params: { status: 'COMPLETED,CONFIRMED', limit: 50 } });
      return res.data?.data ?? res.data ?? [];
    },
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
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={DARK} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {bookings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySubtitle}>Completed trips will appear here</Text>
          </View>
        )}
        {bookings.map((b: any) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.ref}>{b.booking_reference}</Text>
              <Text style={styles.amount}>{fmtMoney(b.total_price_minor, b.currency)}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={13} color={MUTED} />
              <Text style={styles.date}>{fmtDateShort(b.pickup_at_utc)}</Text>
            </View>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.addr} numberOfLines={1}>{b.pickup_address_text}</Text>
            </View>
            {b.dropoff_address_text && (
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.addr} numberOfLines={1}>{b.dropoff_address_text}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  title: { fontSize: 20, fontWeight: '700', color: TEXT },
  scroll: { flex: 1 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16, padding: 16, marginBottom: 12, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref:      { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'monospace' },
  amount:   { fontSize: 16, fontWeight: '700', color: GOLD },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  date:     { fontSize: 12, color: MUTED },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot:      { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  addr:     { flex: 1, fontSize: 13, color: SUB, lineHeight: 18 },
  emptyState:    { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji:    { fontSize: 48 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: TEXT },
  emptySubtitle: { fontSize: 14, color: SUB },
});
