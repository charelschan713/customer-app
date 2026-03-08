import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED } from '../../src/lib/format';

const BRAND_ICON: Record<string, string> = {
  visa: '💳', mastercard: '💳', amex: '💳', default: '💳',
};

export default function PaymentsScreen() {
  const queryClient = useQueryClient();

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/customer-portal/payment-methods');
      return res.data?.data ?? res.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customer-portal/payment-methods/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  const handleDelete = (id: string, last4: string) => {
    Alert.alert('Remove Card', `Remove card ending in ${last4}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {isLoading && <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />}
        {!isLoading && methods.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No saved cards</Text>
            <Text style={styles.emptyText}>Cards are saved automatically when you complete a booking.</Text>
          </View>
        )}
        {methods.map((m: any) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardIcon}>{BRAND_ICON[m.brand] ?? '💳'}</Text>
              <View>
                <Text style={styles.cardBrand}>{m.brand?.toUpperCase()} •••• {m.last4}</Text>
                <Text style={styles.cardExpiry}>Expires {m.exp_month}/{m.exp_year}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(m.id, m.last4)} disabled={deleteMutation.isPending}>
              <Text style={styles.deleteBtn}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.note}>
          <Text style={styles.noteText}>💡 Your card details are securely stored by Stripe. We never store card numbers.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: TEXT },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { fontSize: 28 },
  cardBrand: { fontSize: 15, fontWeight: '600', color: TEXT },
  cardExpiry: { fontSize: 12, color: MUTED, marginTop: 2 },
  deleteBtn: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: TEXT },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 20 },
  note: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginTop: 20 },
  noteText: { fontSize: 13, color: MUTED, lineHeight: 20 },
});
