import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StripeProvider, CardField, useStripe } from '@stripe/stripe-react-native';
import api, { TENANT_SLUG } from '../../../src/lib/api';
import { getStoredUser } from '../../../src/lib/auth';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney } from '../../../src/lib/format';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PK ?? '';

export default function CheckoutScreen() {
  const { result, sessionId, form } = useLocalSearchParams<{ result: string; sessionId: string; form: string }>();
  const quoteResult = JSON.parse(result ?? '{}');
  const formData    = JSON.parse(form ?? '{}');

  const { createPaymentMethod } = useStripe();
  const [user, setUser]     = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [pax, setPax] = useState({
    firstName: '', lastName: '', email: '', phone: '', notes: '',
  });

  useEffect(() => {
    getStoredUser().then((u) => {
      if (u) {
        setUser(u);
        setPax(p => ({
          ...p,
          firstName: u.first_name ?? '',
          lastName:  u.last_name  ?? '',
          email:     u.email      ?? '',
          phone:     u.phone      ?? '',
        }));
      }
    });
  }, []);

  const set = (k: string) => (v: string) => setPax(p => ({ ...p, [k]: v }));

  const handlePay = async () => {
    if (!pax.firstName || !pax.email) {
      Alert.alert('Required', 'Please enter your name and email');
      return;
    }
    if (!cardComplete) {
      Alert.alert('Card', 'Please enter your card details');
      return;
    }

    setLoading(true);
    try {
      // Create payment method
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: { billingDetails: { name: `${pax.firstName} ${pax.lastName}` } },
      });

      if (error || !paymentMethod) {
        Alert.alert('Card Error', error?.message ?? 'Card setup failed');
        setLoading(false);
        return;
      }

      const token = await (await import('expo-secure-store')).getItemAsync('token');

      if (token) {
        // Logged-in checkout
        const res = await api.post('/customer-portal/bookings', {
          quote_session_id: sessionId,
          car_type_id: quoteResult.car_type_id,
          payment_method_id: paymentMethod.id,
          passenger_first_name: pax.firstName,
          passenger_last_name:  pax.lastName,
          passenger_email:      pax.email,
          passenger_phone:      pax.phone,
          special_requests:     pax.notes,
        });
        router.replace({ pathname: '/(app)/bookings/success', params: { ref: res.data.booking_reference } });
      } else {
        // Guest checkout
        const res = await api.post('/customer-portal/guest/checkout', {
          quote_session_id: sessionId,
          car_type_id: quoteResult.car_type_id,
          payment_method_id: paymentMethod.id,
          first_name:   pax.firstName,
          last_name:    pax.lastName,
          email:        pax.email,
          phone:        pax.phone,
          special_requests: pax.notes,
          tenant_slug:  TENANT_SLUG,
        });
        router.replace({ pathname: '/(app)/bookings/success', params: { ref: res.data.booking_reference } });
      }
    } catch (e: any) {
      Alert.alert('Booking Failed', e.response?.data?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_PK}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
            <Text style={styles.title}>Confirm & Pay</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>BOOKING SUMMARY</Text>
              <Text style={styles.carName}>{quoteResult.car_type_name}</Text>
              <Text style={styles.route} numberOfLines={2}>
                {formData.pickup} → {formData.dropoff}
              </Text>
              <Text style={styles.pickup}>📅 {formData.date} {formData.time}</Text>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>{fmtMoney(quoteResult.estimated_total_minor, quoteResult.currency)}</Text>
              </View>
            </View>

            {/* Passenger details */}
            <Text style={styles.sectionTitle}>Passenger Details</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextInput style={styles.input} value={pax.firstName} onChangeText={set('firstName')} placeholder="First Name *" placeholderTextColor={MUTED} />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput style={styles.input} value={pax.lastName} onChangeText={set('lastName')} placeholder="Last Name" placeholderTextColor={MUTED} />
              </View>
            </View>
            <TextInput style={styles.input} value={pax.email} onChangeText={set('email')} placeholder="Email *" placeholderTextColor={MUTED} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={[styles.input, { marginTop: 10 }]} value={pax.phone} onChangeText={set('phone')} placeholder="Phone" placeholderTextColor={MUTED} keyboardType="phone-pad" />
            <TextInput style={[styles.input, { marginTop: 10, minHeight: 80 }]} value={pax.notes} onChangeText={set('notes')} placeholder="Special requests (optional)" placeholderTextColor={MUTED} multiline />

            {/* Card */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Payment</Text>
            <CardField
              postalCodeEnabled={false}
              style={styles.card}
              cardStyle={{
                backgroundColor: CARD,
                textColor: TEXT,
                placeholderColor: MUTED,
                borderRadius: 12,
              }}
              onCardChange={(c) => setCardComplete(c.complete)}
            />

            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handlePay} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : (
                <Text style={styles.btnText}>Pay {fmtMoney(quoteResult.estimated_total_minor, quoteResult.currency)}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { color: GOLD, fontSize: 15, fontWeight: '500', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: TEXT },
  summary: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 24, gap: 6 },
  summaryLabel: { fontSize: 10, color: GOLD, fontWeight: '700', letterSpacing: 2 },
  carName: { fontSize: 18, fontWeight: '700', color: TEXT },
  route: { fontSize: 13, color: MUTED },
  pickup: { fontSize: 13, color: MUTED },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: TEXT },
  totalVal: { fontSize: 22, fontWeight: '700', color: GOLD },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input: { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER },
  card: { height: 54, marginBottom: 4 },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#000', fontSize: 17, fontWeight: '700' },
});
