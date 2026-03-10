import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../src/lib/api';
import { BG, CARD, GOLD, BORDER, TEXT, MUTED, fmtMoney, fmtDate } from '../../../src/lib/format';
import {
  OP_STATUS_CONFIG,
  DRIVER_EXEC_STATUS,
  CANCELLABLE_STATUSES,
  CUSTOMER_CONFIRMABLE_STATUSES,
  TERMINAL_STATUSES,
} from '../../../src/lib/booking-status';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await api.get(`/customer-portal/bookings/${id}`);
      return res.data;
    },
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/customer-portal/bookings/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/customer-portal/bookings/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
  });

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  if (isLoading) return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={GOLD} size="large" />
    </View>
  );

  if (!booking) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <TouchableOpacity style={{ padding: 20 }} onPress={() => router.back()}>
        <Text style={{ color: GOLD }}>← Back</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: MUTED }}>Booking not found</Text>
      </View>
    </SafeAreaView>
  );

  const statusCfg   = OP_STATUS_CONFIG[booking.operational_status];
  const statusColor = statusCfg?.color ?? '#888';
  const statusLabel = statusCfg?.label ?? booking.operational_status?.replace(/_/g, ' ') ?? '';
  const driverStatus = booking.assignments?.[0]?.driver_execution_status;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.ref}>{booking.booking_reference}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
          {driverStatus && DRIVER_EXEC_STATUS[driverStatus] && (
            <Text style={styles.driverStatus}>
              {DRIVER_EXEC_STATUS[driverStatus].emoji} {DRIVER_EXEC_STATUS[driverStatus].label}
            </Text>
          )}
        </View>

        {/* Driver en-route / arrived banners — use lowercase backend values */}
        {driverStatus === 'on_the_way' && (
          <View style={styles.enRoute}>
            <Text style={styles.enRouteText}>🚗 Your chauffeur is on the way!</Text>
          </View>
        )}
        {driverStatus === 'arrived' && (
          <View style={[styles.enRoute, { backgroundColor: '#f97316' + '20', borderColor: '#f97316' + '40' }]}>
            <Text style={[styles.enRouteText, { color: '#f97316' }]}>📍 Your chauffeur has arrived!</Text>
          </View>
        )}

        {/* Trip info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TRIP DETAILS</Text>
          <Row label="Date & Time" value={fmtDate(booking.pickup_at_utc)} />
          <Row label="Vehicle" value={booking.car_type_name ?? booking.service_class_name} />
          <Row label="Passengers" value={`${booking.passenger_count} pax`} />
          {booking.luggage_count > 0 && <Row label="Luggage" value={`${booking.luggage_count} bags`} />}
          {booking.special_requests && <Row label="Requests" value={booking.special_requests} highlight />}
        </View>

        {/* Route */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ROUTE</Text>
          <TouchableOpacity style={styles.addrRow} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(booking.pickup_address_text)}`)}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addrLabel}>Pickup</Text>
              <Text style={styles.addrText}>{booking.pickup_address_text}</Text>
            </View>
            <Text style={styles.mapsLink}>Maps →</Text>
          </TouchableOpacity>
          {booking.dropoff_address_text && (
            <TouchableOpacity style={styles.addrRow} onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(booking.dropoff_address_text)}`)}>
              <View style={[styles.dot, { backgroundColor: GOLD }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>Drop-off</Text>
                <Text style={styles.addrText}>{booking.dropoff_address_text}</Text>
              </View>
              <Text style={styles.mapsLink}>Maps →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Driver info */}
        {booking.assignments?.[0] && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>YOUR CHAUFFEUR</Text>
            <Row label="Name" value={booking.assignments[0].driver_name ?? 'Assigned'} />
            {booking.assignments[0].driver_phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${booking.assignments[0].driver_phone}`)}>
                <View style={styles.callBtn}>
                  <Text style={styles.callBtnText}>📞 Call Chauffeur</Text>
                </View>
              </TouchableOpacity>
            )}
            {booking.assignments[0].vehicle_name && (
              <Row label="Vehicle" value={booking.assignments[0].vehicle_name} />
            )}
          </View>
        )}

        {/* Pricing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PRICING</Text>
          {booking.prepay_base_fare_minor > 0 && <Row label="Base Fare" value={fmtMoney(booking.prepay_base_fare_minor, booking.currency)} />}
          {booking.prepay_toll_minor > 0 && <Row label="Tolls" value={fmtMoney(booking.prepay_toll_minor, booking.currency)} />}
          {booking.prepay_parking_minor > 0 && <Row label="Parking" value={fmtMoney(booking.prepay_parking_minor, booking.currency)} />}
          {booking.discount_total_minor > 0 && <Row label="Discount" value={`−${fmtMoney(booking.discount_total_minor, booking.currency)}`} color="#22c55e" />}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalVal}>{fmtMoney(booking.total_price_minor, booking.currency)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 10, marginTop: 8 }}>
          {CUSTOMER_CONFIRMABLE_STATUSES.includes(booking.operational_status as any) && (
            <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.confirmBtnText}>✓ Confirm Booking</Text>}
            </TouchableOpacity>
          )}
          {CANCELLABLE_STATUSES.includes(booking.operational_status as any) && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelMutation.isPending}>
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight, color }: { label: string; value: any; highlight?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ color: MUTED, fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: color ?? (highlight ? '#f59e0b' : TEXT), fontSize: 14, fontWeight: '500', flex: 2, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  back: { color: GOLD, fontSize: 15, fontWeight: '500', width: 60 },
  ref: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'monospace' },
  statusBanner: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12, alignItems: 'center', gap: 4 },
  statusText: { fontSize: 16, fontWeight: '700' },
  driverStatus: { fontSize: 13, color: MUTED },
  enRoute: { backgroundColor: '#3b82f6' + '18', borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6' + '40', padding: 14, marginBottom: 12, alignItems: 'center' },
  enRouteText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12, gap: 4 },
  cardTitle: { fontSize: 10, color: GOLD, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  addrLabel: { fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  addrText: { fontSize: 14, color: TEXT, marginTop: 2 },
  mapsLink: { color: '#3b82f6', fontWeight: '600', fontSize: 13 },
  callBtn: { backgroundColor: '#22c55e' + '18', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e' + '40', marginTop: 6 },
  callBtnText: { color: '#22c55e', fontWeight: '600', fontSize: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  totalVal: { fontSize: 20, fontWeight: '700', color: GOLD },
  confirmBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' + '50' },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
});
