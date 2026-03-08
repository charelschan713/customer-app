import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney } from '../../../src/lib/format';

export default function CarsScreen() {
  const { quote, form } = useLocalSearchParams<{ quote: string; form: string }>();
  const quoteData = JSON.parse(quote ?? '{}');
  const formData  = JSON.parse(form ?? '{}');
  const results   = quoteData.results ?? [];
  const sessionId = quoteData.session_id ?? quoteData.quote_session_id ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Vehicle</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.sub}>{results.length} vehicles available</Text>

        {results.map((r: any) => (
          <TouchableOpacity key={r.car_type_id} style={styles.card}
            onPress={() => router.push({
              pathname: '/(app)/book/checkout',
              params: { result: JSON.stringify(r), sessionId, form },
            })}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.carName}>{r.car_type_name}</Text>
                <Text style={styles.carClass}>{r.service_class_name}</Text>
                <View style={styles.specs}>
                  <Text style={styles.spec}>👤 {r.max_passengers} pax</Text>
                  <Text style={styles.spec}>🧳 {r.max_luggage} bags</Text>
                </View>
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>{fmtMoney(r.estimated_total_minor, r.currency)}</Text>
                {r.original_total_minor && r.original_total_minor > r.estimated_total_minor && (
                  <Text style={styles.original}>{fmtMoney(r.original_total_minor, r.currency)}</Text>
                )}
              </View>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdown}>
              {r.base_fare_minor > 0 && (
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Base Fare</Text>
                  <Text style={styles.bVal}>{fmtMoney(r.base_fare_minor, r.currency)}</Text>
                </View>
              )}
              {r.toll_minor > 0 && (
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Tolls</Text>
                  <Text style={styles.bVal}>{fmtMoney(r.toll_minor, r.currency)}</Text>
                </View>
              )}
              {r.discount_minor > 0 && (
                <View style={styles.bRow}>
                  <Text style={styles.bLabel}>Discount</Text>
                  <Text style={[styles.bVal, { color: '#22c55e' }]}>−{fmtMoney(r.discount_minor, r.currency)}</Text>
                </View>
              )}
            </View>

            <View style={styles.selectRow}>
              <Text style={styles.eta}>~{r.duration_minutes ?? '?'} mins</Text>
              <Text style={styles.selectBtn}>Select →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { color: GOLD, fontSize: 15, fontWeight: '500', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: TEXT },
  sub: { fontSize: 13, color: MUTED, marginBottom: 16 },
  card: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  carName: { fontSize: 17, fontWeight: '700', color: TEXT },
  carClass: { fontSize: 12, color: MUTED, marginTop: 2 },
  specs: { flexDirection: 'row', gap: 12, marginTop: 8 },
  spec: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: 22, fontWeight: '700', color: GOLD },
  original: { fontSize: 13, color: MUTED, textDecorationLine: 'line-through' },
  breakdown: { gap: 4, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bLabel: { fontSize: 13, color: MUTED },
  bVal: { fontSize: 13, color: TEXT },
  selectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eta: { fontSize: 13, color: MUTED },
  selectBtn: { fontSize: 15, fontWeight: '700', color: GOLD },
});
