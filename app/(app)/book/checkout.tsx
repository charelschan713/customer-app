import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StripeProvider, CardField, useStripe } from '@stripe/stripe-react-native';
import * as SecureStore from 'expo-secure-store';
import api, { TENANT_SLUG } from '../../../src/lib/api';
import { getStoredUser } from '../../../src/lib/auth';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney } from '../../../src/lib/format';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PK ?? '';

export default function CheckoutScreen() {
  const { result, sessionId, form } = useLocalSearchParams<{ result: string; sessionId: string; form: string }>();
  const quoteResult = JSON.parse(result ?? '{}');
  const formData    = JSON.parse(form ?? '{}');

  const { createPaymentMethod, confirmSetupIntent, handleNextAction } = useStripe();
  const [user, setUser]               = useState<any>(null);
  const [savedCards, setSavedCards]   = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [useNewCard, setUseNewCard]   = useState(false);
  const [loading, setLoading]         = useState(false);
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
        }));
        api.get('/customer-portal/payment-methods').then(r => {
          const rawCards = r.data?.data ?? r.data ?? [];
          // Null-guard: only include cards that have a usable stripe_payment_method_id
          const cards = rawCards.filter((c: any) => !!c.stripe_payment_method_id);
          setSavedCards(cards);
          if (cards.length > 0) {
            const def = cards.find((c: any) => c.is_default) ?? cards[0];
            setSelectedCard(def.stripe_payment_method_id ?? null);
          } else {
            setUseNewCard(true);
          }
        }).catch(() => setUseNewCard(true));
      } else {
        setUseNewCard(true);
      }
    });
  }, []);

  const set = (k: string) => (v: string) => setPax(p => ({ ...p, [k]: v }));

  // ── Full booking payload ─────────────────────────────────────────────────
  // NOTE: Server-side price is authoritative (quote session). totalPriceMinor
  // is sent as a hint only; backend re-validates from quote session.
  const buildPayload = (paymentMethodId?: string, setupIntentId?: string) => ({
    quoteId:           sessionId,
    vehicleClassId:    quoteResult.service_class_id,
    totalPriceMinor:   quoteResult.estimated_total_minor,
    currency:          quoteResult.currency ?? 'AUD',
    // Passenger
    passengerCount:    formData.passengerCount    ?? 1,
    luggageCount:      formData.luggageCount      ?? 0,
    passengerFirstName: pax.firstName             || undefined,
    passengerLastName:  pax.lastName              || undefined,
    passengerEmail:     pax.email                 || undefined,
    passengerPhone:     pax.phone                 || undefined,
    notes:              pax.notes                 || undefined,
    // Trip extras
    waypoints:     formData.waypoints?.filter(Boolean) ?? [],
    infantSeats:   formData.infantSeats   ?? 0,
    toddlerSeats:  formData.toddlerSeats  ?? 0,
    boosterSeats:  formData.boosterSeats  ?? 0,
    isReturnTrip:  formData.isReturnTrip  ?? false,
    ...(formData.isReturnTrip && formData.returnDate && formData.returnTime
      ? {
          returnPickupAtUtc: (() => {
            try { return new Date(`${formData.returnDate}T${formData.returnTime}:00`).toISOString(); } catch { return undefined; }
          })(),
          returnPickupAddressText: formData.dropoff || formData.pickup,
        }
      : {}),
    // Payment
    ...(paymentMethodId ? { paymentMethodId } : {}),
    ...(setupIntentId   ? { setupIntentId }   : {}),
  });

  // ── Create booking helper ────────────────────────────────────────────────
  const createBooking = async (paymentMethodId?: string, setupIntentId?: string) => {
    const isLoggedIn = !!user;
    const currentToken = await SecureStore.getItemAsync('token').catch(() => null);

    if (isLoggedIn && currentToken) {
      const res = await api.post('/customer-portal/bookings', buildPayload(paymentMethodId, setupIntentId));
      return res.data?.booking ?? res.data;
    } else {
      // Guest checkout
      const res = await api.post('/customer-portal/guest/checkout', {
        ...buildPayload(paymentMethodId, setupIntentId),
        guestCheckout: true,
        tenantSlug:    TENANT_SLUG,
        firstName:     pax.firstName,
        lastName:      pax.lastName,
        email:         pax.email,
        phone:         pax.phone,
      });
      return res.data?.booking ?? res.data;
    }
  };

  // ── Navigate to success ──────────────────────────────────────────────────
  const navigateSuccess = (booking: any) => {
    // Clear quote draft — booking completed
    SecureStore.deleteItemAsync('quote_draft').catch(() => {});
    SecureStore.deleteItemAsync('post_login_route').catch(() => {});
    router.replace({
      pathname: '/(app)/bookings/success',
      params: { ref: booking?.booking_reference ?? booking?.id ?? '' },
    });
  };

  // ── Main pay handler ────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!pax.firstName || !pax.email) {
      Alert.alert('Required', 'Please enter your name and email');
      return;
    }
    setLoading(true);
    try {
      // ── Path A: Saved card ──────────────────────────────────────────────
      if (selectedCard && !useNewCard) {
        const booking = await createBooking(selectedCard);
        navigateSuccess(booking);
        return;
      }

      // ── Path B: New card ────────────────────────────────────────────────
      if (!cardComplete) {
        Alert.alert('Card', 'Please enter your card details');
        return;
      }

      const isLoggedIn = !!user;

      if (isLoggedIn) {
        // Aligned with web: use SetupIntent so the card is saved to customer account.
        // confirmSetupIntent handles 3DS inline (same as web's confirmCardSetup).
        let siClientSecret: string;
        try {
          const { data: siData } = await api.post('/customer-portal/payments/setup-intent');
          siClientSecret = siData.client_secret;
        } catch {
          // Fallback: use createPaymentMethod if setup-intent unavailable
          await handlePayWithCreatePM(isLoggedIn);
          return;
        }

        const { setupIntent, error: siError } = await confirmSetupIntent(siClientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {
              name: `${pax.firstName} ${pax.lastName}`.trim(),
              email: pax.email || undefined,
            },
          },
        });

        if (siError) throw new Error(siError.message ?? 'Card verification failed');
        if (!setupIntent || setupIntent.status !== 'Succeeded') {
          throw new Error('Card verification failed. Please try again.');
        }

        const booking = await createBooking(undefined, setupIntent.id);
        navigateSuccess(booking);
      } else {
        // Guest: createPaymentMethod (no setup intent needed for guest)
        await handlePayWithCreatePM(false);
      }
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.response?.data?.message ?? e?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  // Fallback / guest path: createPaymentMethod (no card saving)
  const handlePayWithCreatePM = async (isLoggedIn: boolean) => {
    const { paymentMethod, error } = await createPaymentMethod({
      paymentMethodType: 'Card',
      paymentMethodData: {
        billingDetails: { name: `${pax.firstName} ${pax.lastName}`.trim() },
      },
    });
    if (error || !paymentMethod) throw new Error(error?.message ?? 'Card setup failed');
    const booking = await createBooking(paymentMethod.id);
    navigateSuccess(booking);
  };

  const totalFare = quoteResult.estimated_total_minor ?? 0;

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
              <Text style={styles.carName}>{quoteResult.car_type_name ?? quoteResult.service_class_name}</Text>
              <Text style={styles.route} numberOfLines={2}>{formData.pickup} → {formData.dropoff}</Text>
              <Text style={styles.pickup}>📅 {formData.date} {formData.time}</Text>
              {formData.isReturnTrip && formData.returnDate && (
                <Text style={styles.pickup}>↩ Return: {formData.returnDate} {formData.returnTime}</Text>
              )}
              {(formData.waypoints?.filter(Boolean)?.length ?? 0) > 0 && (
                <Text style={styles.pickup}>
                  📍 {formData.waypoints.filter(Boolean).length} stop{formData.waypoints.filter(Boolean).length > 1 ? 's' : ''}
                </Text>
              )}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>{fmtMoney(totalFare, quoteResult.currency)}</Text>
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

            {/* Payment */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Payment</Text>

            {/* Saved cards */}
            {savedCards.length > 0 && (
              <View style={{ gap: 8, marginBottom: 12 }}>
                {savedCards.map((c: any) => (
                  <TouchableOpacity key={c.stripe_payment_method_id}
                    onPress={() => { setSelectedCard(c.stripe_payment_method_id); setUseNewCard(false); }}
                    style={[styles.cardOption, !useNewCard && selectedCard === c.stripe_payment_method_id && styles.cardOptionSelected]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardBrand}>{c.brand?.toUpperCase()} •••• {c.last4}</Text>
                      <Text style={styles.cardExpiry}>Expires {c.exp_month}/{c.exp_year}</Text>
                    </View>
                    {!useNewCard && selectedCard === c.stripe_payment_method_id && (
                      <View style={styles.radioSelected}><View style={styles.radioInner} /></View>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => { setUseNewCard(true); setSelectedCard(null); }}
                  style={[styles.cardOption, useNewCard && styles.cardOptionSelected]}>
                  <Text style={{ color: TEXT, fontSize: 14 }}>+ Use a different card</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* New card field */}
            {(savedCards.length === 0 || useNewCard) && (
              <CardField
                postalCodeEnabled={false}
                style={styles.card}
                cardStyle={{ backgroundColor: CARD, textColor: TEXT, placeholderColor: MUTED, borderRadius: 12 }}
                onCardChange={(c) => setCardComplete(c.complete)}
              />
            )}

            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handlePay} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : (
                <Text style={styles.btnText}>
                  {selectedCard && !useNewCard ? 'Confirm Booking' : 'Add Card & Confirm'} — {fmtMoney(totalFare, quoteResult.currency)}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Payment is confirmed. Your chauffeur will be assigned before your pickup time.
              Fare is based on confirmed quote. Toll/parking charges apply separately.
            </Text>
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
  cardOption: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, flexDirection: 'row', alignItems: 'center' },
  cardOptionSelected: { borderColor: GOLD, backgroundColor: `${GOLD}15` },
  cardBrand: { fontSize: 15, fontWeight: '600', color: TEXT },
  cardExpiry: { fontSize: 12, color: MUTED, marginTop: 2 },
  radioSelected: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  card: { height: 54, marginBottom: 4 },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
