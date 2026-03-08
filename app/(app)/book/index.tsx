/**
 * Book a Ride — 1:1 port of web portal QuoteClient.tsx
 * Dark luxury theme, same API calls, same flow
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  FlatList, StyleSheet, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api, { TENANT_SLUG } from '@/src/lib/api';

// ── Theme ──────────────────────────────────────────────────────────────────
const BG     = '#1A1A2E';
const CARD   = '#222236';
const BORDER = '#333355';
const GOLD   = '#C8A870';
const TEXT   = '#FFFFFF';
const MUTED  = '#9CA3AF';
const GREEN  = '#34D399';
const RED    = '#F87171';

// ── Types ──────────────────────────────────────────────────────────────────
type City        = { id: string; name: string; timezone: string; lat?: number; lng?: number };
type ServiceType = { id: string; code: string; name: string; calculation_type: string; minimum_hours?: number | null; surge_multiplier?: number | null };
type QuoteResult = {
  service_class_id: string;
  service_class_name: string;
  estimated_total_minor: number;
  currency: string;
  discount?: { name: string; type: string; value: number; discount_minor: number } | null;
  pricing_snapshot_preview: {
    base_calculated_minor: number;
    toll_parking_minor: number;
    surcharge_labels?: string[];
    pre_discount_total_minor?: number;
    discount_amount_minor: number;
    grand_total_minor: number;
    minimum_applied: boolean;
    waypoints_minor?: number;
    baby_seats_minor?: number;
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtMoney(minor: number, currency = 'AUD') {
  return `$${(minor / 100).toFixed(2)}`;
}
const isHourly = (st?: ServiceType) => st?.calculation_type === 'HOURLY_CHARTER';
const isP2P    = (st?: ServiceType) => st?.code === 'POINT_TO_POINT';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoToDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDisplayDate(s: string) {
  const d = isoToDate(s);
  if (!d) return 'Select date';
  return `${DAYS_SHORT[d.getDay()][0]+DAYS_SHORT[d.getDay()].slice(1)}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}
function fmtDisplayTime(s: string) {
  if (!s) return 'Select time';
  const [h24, m] = s.split(':').map(Number);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
}

// ── Stepper ────────────────────────────────────────────────────────────────
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={s.stepper}>
      <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={s.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={s.stepValue}>{value}</Text>
      <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={s.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Section Label ──────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionLabel}>{children}</Text>;
}

// ── Calendar Modal ─────────────────────────────────────────────────────────
function CalendarModal({ visible, value, minDate, onConfirm, onClose }: {
  visible: boolean; value: string; minDate?: string;
  onConfirm: (v: string) => void; onClose: () => void;
}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const minD  = minDate ? isoToDate(minDate) ?? today : today;
  const selected = isoToDate(value);
  const init = selected ?? minD;
  const [view, setView] = useState(new Date(init.getFullYear(), init.getMonth(), 1));
  const [picked, setPicked] = useState(value);

  const year = view.getFullYear(); const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.calModal} onPress={e => e.stopPropagation()}>
          {/* Month nav */}
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => setView(v => new Date(v.getFullYear(), v.getMonth()-1, 1))} style={s.calNavBtn}>
              <Ionicons name="chevron-back" size={18} color={MUTED} />
            </TouchableOpacity>
            <Text style={s.calMonthTitle}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={() => setView(v => new Date(v.getFullYear(), v.getMonth()+1, 1))} style={s.calNavBtn}>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>
          {/* Day headers */}
          <View style={s.calDayHeaders}>
            {DAYS_SHORT.map(d => <Text key={d} style={s.calDayHeader}>{d}</Text>)}
          </View>
          {/* Cells */}
          <View style={s.calGrid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={s.calCellEmpty} />;
              const cellDate = new Date(year, month, day);
              const iso = dateToIso(cellDate);
              const disabled = cellDate < minD;
              const isSel = picked === iso;
              const isTdy = dateToIso(today) === iso;
              return (
                <TouchableOpacity key={i} disabled={disabled} onPress={() => setPicked(iso)}
                  style={[s.calCell, isSel && s.calCellSelected, isTdy && !isSel && s.calCellToday, disabled && s.calCellDisabled]}>
                  <Text style={[s.calCellText, isSel && s.calCellTextSelected, disabled && s.calCellTextDisabled]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={s.calConfirmBtn} onPress={() => { onConfirm(picked); onClose(); }}>
            <Text style={s.calConfirmText}>Confirm</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Time Modal ─────────────────────────────────────────────────────────────
function TimeModal({ visible, value, onConfirm, onClose }: {
  visible: boolean; value: string;
  onConfirm: (v: string) => void; onClose: () => void;
}) {
  const initH24 = value ? parseInt(value.split(':')[0]) : 9;
  const initM   = value ? Math.round(parseInt(value.split(':')[1]) / 5) * 5 : 0;
  const initP: 'AM'|'PM' = initH24 >= 12 ? 'PM' : 'AM';
  const initH12 = initH24 % 12 === 0 ? 12 : initH24 % 12;

  const [hour, setHour]   = useState(initH12);
  const [minute, setMinute] = useState(initM);
  const [period, setPeriod] = useState<'AM'|'PM'>(initP);

  const hours   = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const buildTime = (h: number, m: number, p: 'AM'|'PM') => {
    const h24 = p === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    return `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.timeModal} onPress={e => e.stopPropagation()}>
          <Text style={s.timeTitle}>Select Time</Text>
          <View style={s.timeRow}>
            {/* Hours */}
            <View style={s.timeCol}>
              <Text style={s.timeColLabel}>Hour</Text>
              <FlatList data={hours} keyExtractor={h => String(h)} showsVerticalScrollIndicator={false}
                style={s.timeList}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => setHour(item)} style={[s.timeItem, hour === item && s.timeItemSelected]}>
                    <Text style={[s.timeItemText, hour === item && s.timeItemTextSelected]}>{String(item).padStart(2,'0')}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            {/* Minutes */}
            <View style={s.timeCol}>
              <Text style={s.timeColLabel}>Min</Text>
              <FlatList data={minutes} keyExtractor={m => String(m)} showsVerticalScrollIndicator={false}
                style={s.timeList}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => setMinute(item)} style={[s.timeItem, minute === item && s.timeItemSelected]}>
                    <Text style={[s.timeItemText, minute === item && s.timeItemTextSelected]}>{String(item).padStart(2,'0')}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            {/* AM/PM */}
            <View style={s.timeCol}>
              <Text style={s.timeColLabel}>Period</Text>
              {(['AM','PM'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[s.timeItem, period === p && s.timeItemSelected]}>
                  <Text style={[s.timeItemText, period === p && s.timeItemTextSelected]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={s.calConfirmBtn} onPress={() => { onConfirm(buildTime(hour, minute, period)); onClose(); }}>
            <Text style={s.calConfirmText}>Confirm</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── City Picker Modal ──────────────────────────────────────────────────────
function CityPickerModal({ visible, cities, selectedId, onSelect, onClose }: {
  visible: boolean; cities: City[]; selectedId: string;
  onSelect: (id: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable style={s.pickerModal} onPress={e => e.stopPropagation()}>
          <Text style={s.pickerTitle}>Select City</Text>
          {cities.map(city => (
            <TouchableOpacity key={city.id} style={[s.pickerItem, city.id === selectedId && s.pickerItemSelected]}
              onPress={() => { onSelect(city.id); onClose(); }}>
              <Text style={[s.pickerItemText, city.id === selectedId && s.pickerItemTextSelected]}>{city.name}</Text>
              {city.id === selectedId && <Ionicons name="checkmark" size={18} color={GOLD} />}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BookScreen() {
  const router = useRouter();

  // ── API data ──────────────────────────────────────────────────────────────
  const { data: cities = [], isLoading: loadingCities } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: () => api.get(`/public/cities?tenant_slug=${TENANT_SLUG}`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const [cityId, setCityId]           = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [tripType, setTripType]       = useState<'ONE_WAY'|'RETURN'>('ONE_WAY');
  const [pickup, setPickup]           = useState('');
  const [dropoff, setDropoff]         = useState('');
  const [waypoints, setWaypoints]     = useState<string[]>([]);
  const [date, setDate]               = useState('');
  const [time, setTime]               = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [passengers, setPassengers]   = useState(1);
  const [luggage, setLuggage]         = useState(0);
  const [infantSeats, setInfantSeats] = useState(0);
  const [toddlerSeats, setToddlerSeats] = useState(0);
  const [boosterSeats, setBoosterSeats] = useState(0);
  const [babySeatExpanded, setBabySeatExpanded] = useState(false);

  const [quoteResults, setQuoteResults] = useState<QuoteResult[]>([]);
  const [quoteId, setQuoteId]         = useState<string | null>(null);
  const [selectedServiceClassId, setSelectedServiceClassId] = useState<string | null>(null);
  const [currency, setCurrency]       = useState('AUD');
  const [quoting, setQuoting]         = useState(false);

  // Modal visibility
  const [showCityPicker, setShowCityPicker]   = useState(false);
  const [showCalendar, setShowCalendar]       = useState(false);
  const [showTimePicker, setShowTimePicker]   = useState(false);

  // Derived
  const effectiveCityId = cityId || (cities[0]?.id ?? '');
  const selectedCity    = cities.find(c => c.id === effectiveCityId);

  const { data: serviceTypes = [], isLoading: loadingServiceTypes } = useQuery<ServiceType[]>({
    queryKey: ['service-types', effectiveCityId],
    queryFn: () => api.get(`/public/service-types?tenant_slug=${TENANT_SLUG}&city_id=${effectiveCityId}`).then(r => r.data),
    enabled: !!effectiveCityId,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveServiceTypeId = serviceTypeId || (serviceTypes[0]?.id ?? '');
  const selectedServiceType    = serviceTypes.find(s => s.id === effectiveServiceTypeId);
  const hourly   = isHourly(selectedServiceType);
  const p2p      = isP2P(selectedServiceType);
  const minHours = selectedServiceType?.minimum_hours ?? (hourly ? 2 : null);

  const totalSeats = infantSeats + toddlerSeats + boosterSeats;
  const seatError  = totalSeats > 0 && totalSeats >= passengers;

  const clearQuote = useCallback(() => {
    setQuoteResults([]);
    setQuoteId(null);
    setSelectedServiceClassId(null);
  }, []);

  // ── Get Quote ─────────────────────────────────────────────────────────────
  const handleGetQuote = useCallback(async () => {
    if (!pickup || !date || !time) {
      Alert.alert('Missing Info', 'Please fill in pickup address, date and time.');
      return;
    }
    if (seatError) {
      Alert.alert('Seat Error', 'Baby seats must be fewer than total passengers.');
      return;
    }
    const pickupMs = new Date(`${date}T${time}:00`).getTime();
    if (pickupMs - Date.now() < 12 * 3600 * 1000) {
      Alert.alert(
        'Short Notice',
        'Bookings require at least 12 hours notice. For urgent requests please call +61 2 8009 1008.',
        [{ text: 'OK' }]
      );
      return;
    }

    setQuoting(true);
    clearQuote();

    try {
      const pickupAtUtcStr = new Date(`${date}T${time}:00`).toISOString();
      const effectiveDropoff = dropoff || pickup;

      const body: Record<string, unknown> = {
        tenant_slug: TENANT_SLUG,
        service_type_id: effectiveServiceTypeId,
        city_id: effectiveCityId || undefined,
        trip_mode: hourly ? 'ONE_WAY' : tripType,
        pickup_address: pickup,
        dropoff_address: effectiveDropoff,
        pickup_at: pickupAtUtcStr,
        timezone: selectedCity?.timezone ?? 'Australia/Sydney',
        passenger_count: passengers,
        luggage_count: luggage,
        waypoints: waypoints.filter(Boolean),
        infant_seats: infantSeats,
        toddler_seats: toddlerSeats,
        booster_seats: boosterSeats,
      };
      if (hourly) body.duration_hours = durationHours;

      const resp = await api.post(`/public/pricing/quote`, body);
      const quote = resp.data;
      setQuoteId(quote.quote_id);
      setQuoteResults(quote.results ?? []);
      setCurrency(quote.currency ?? 'AUD');
      if (quote.results?.length > 0) setSelectedServiceClassId(quote.results[0].service_class_id);
    } catch (err: any) {
      Alert.alert('Quote Failed', err?.response?.data?.message ?? 'Unable to get quote. Please try again.');
    } finally {
      setQuoting(false);
    }
  }, [pickup, dropoff, date, time, effectiveServiceTypeId, effectiveCityId, tripType, hourly,
      passengers, luggage, infantSeats, toddlerSeats, boosterSeats, durationHours,
      waypoints, selectedCity, clearQuote, seatError]);

  // ── Book Now ──────────────────────────────────────────────────────────────
  const { mutate: bookNow, isPending: booking } = useMutation({
    mutationFn: async ({ quote_id, service_class_id }: { quote_id: string; service_class_id: string }) => {
      const resp = await api.post('/customer-portal/bookings/create-from-quote', { quote_id, service_class_id });
      return resp.data;
    },
    onSuccess: (data) => {
      router.push({ pathname: '/(app)/bookings/success', params: { bookingId: data.id ?? data.booking_id } });
    },
    onError: (err: any) => {
      Alert.alert('Booking Failed', err?.response?.data?.message ?? 'Unable to create booking. Please try again.');
    },
  });

  const loading = loadingCities || loadingServiceTypes;

  if (loading) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  const selectedResult = quoteResults.find(r => r.service_class_id === selectedServiceClassId);

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <Text style={s.pageTitle}>Book a Ride</Text>

          {/* ── City Selector ── */}
          <View style={s.card}>
            <SectionLabel>City</SectionLabel>
            <TouchableOpacity style={s.selectRow} onPress={() => setShowCityPicker(true)}>
              <Ionicons name="location-outline" size={18} color={MUTED} />
              <Text style={s.selectText}>{selectedCity?.name ?? 'Select city'}</Text>
              <Ionicons name="chevron-down" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* ── Service Type Chips ── */}
          {serviceTypes.length > 0 && (
            <View style={s.card}>
              <SectionLabel>Service Type</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {serviceTypes.map(st => {
                  const active = st.id === effectiveServiceTypeId;
                  return (
                    <TouchableOpacity key={st.id} style={[s.chip, active && s.chipActive]}
                      onPress={() => { setServiceTypeId(st.id); setTripType('ONE_WAY'); clearQuote(); }}>
                      <Text style={[s.chipText, active && s.chipTextActive]}>{st.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── One Way / Return Toggle (P2P only) ── */}
          {p2p && !hourly && (
            <View style={s.card}>
              <SectionLabel>Trip Type</SectionLabel>
              <View style={s.toggleRow}>
                {(['ONE_WAY', 'RETURN'] as const).map(tt => (
                  <TouchableOpacity key={tt} style={[s.toggleBtn, tripType === tt && s.toggleBtnActive]}
                    onPress={() => { setTripType(tt); clearQuote(); }}>
                    <Text style={[s.toggleText, tripType === tt && s.toggleTextActive]}>
                      {tt === 'ONE_WAY' ? 'One Way' : 'Return'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Hourly Duration ── */}
          {hourly && (
            <View style={s.card}>
              <SectionLabel>Duration (hours)</SectionLabel>
              <View style={s.durationRow}>
                <Stepper
                  value={durationHours}
                  min={minHours ?? 1}
                  max={24}
                  onChange={v => { setDurationHours(v); clearQuote(); }}
                />
                <Text style={s.durationLabel}>{durationHours} hrs{minHours && durationHours === minHours ? ' (min)' : ''}</Text>
              </View>
            </View>
          )}

          {/* ── Pickup Address ── */}
          <View style={s.card}>
            <SectionLabel>Pickup Location</SectionLabel>
            <View style={s.inputRow}>
              <Ionicons name="location" size={18} color={GREEN} style={s.inputIcon} />
              <TextInput
                style={s.textInput}
                placeholder="Airport, hotel or address..."
                placeholderTextColor={MUTED}
                value={pickup}
                onChangeText={v => { setPickup(v); clearQuote(); }}
              />
            </View>

            {/* Waypoints */}
            {waypoints.map((wp, idx) => (
              <View key={idx} style={[s.inputRow, { marginTop: 10 }]}>
                <Ionicons name="ellipse-outline" size={16} color={MUTED} style={s.inputIcon} />
                <TextInput
                  style={[s.textInput, { flex: 1 }]}
                  placeholder={`Stop ${idx + 1}`}
                  placeholderTextColor={MUTED}
                  value={wp}
                  onChangeText={v => {
                    const next = [...waypoints]; next[idx] = v; setWaypoints(next); clearQuote();
                  }}
                />
                <TouchableOpacity onPress={() => { setWaypoints(w => w.filter((_, i) => i !== idx)); clearQuote(); }} style={s.removeBtn}>
                  <Ionicons name="close-circle" size={20} color={RED} />
                </TouchableOpacity>
              </View>
            ))}

            {waypoints.length < 5 && (
              <TouchableOpacity style={s.addStopBtn} onPress={() => setWaypoints(w => [...w, ''])}>
                <Ionicons name="add-circle-outline" size={16} color={GOLD} />
                <Text style={s.addStopText}>+ Add Stop</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Dropoff Address (hidden for Hourly) ── */}
          {!hourly && (
            <View style={s.card}>
              <SectionLabel>Drop-off Location <Text style={{ color: MUTED, fontWeight: '400' }}>(optional)</Text></SectionLabel>
              <View style={s.inputRow}>
                <Ionicons name="location" size={18} color={RED} style={s.inputIcon} />
                <TextInput
                  style={s.textInput}
                  placeholder="Airport, hotel or destination..."
                  placeholderTextColor={MUTED}
                  value={dropoff}
                  onChangeText={v => { setDropoff(v); clearQuote(); }}
                />
              </View>
            </View>
          )}

          {/* ── Date & Time ── */}
          <View style={s.card}>
            <SectionLabel>Pickup Date & Time</SectionLabel>
            <View style={s.dateTimeRow}>
              <TouchableOpacity style={[s.dateTimeBtn, { flex: 1 }]} onPress={() => setShowCalendar(true)}>
                <Ionicons name="calendar-outline" size={16} color={MUTED} />
                <Text style={[s.dateTimeText, !date && { color: MUTED }]}>{date ? fmtDisplayDate(date) : 'Select date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateTimeBtn, { flex: 1, marginLeft: 8 }]} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={16} color={MUTED} />
                <Text style={[s.dateTimeText, !time && { color: MUTED }]}>{time ? fmtDisplayTime(time) : 'Select time'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Passengers & Luggage ── */}
          <View style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <SectionLabel>Passengers</SectionLabel>
                <Stepper value={passengers} min={1} max={20} onChange={v => { setPassengers(v); clearQuote(); }} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <SectionLabel>Luggage</SectionLabel>
                <Stepper value={luggage} min={0} max={20} onChange={v => { setLuggage(v); clearQuote(); }} />
              </View>
            </View>
          </View>

          {/* ── Baby Seats ── */}
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => setBabySeatExpanded(e => !e)}>
              <Text style={s.sectionLabel}>Baby Seats <Text style={{ color: MUTED, fontWeight: '400' }}>(optional)</Text></Text>
              <Ionicons name={babySeatExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
            </TouchableOpacity>
            {babySeatExpanded && (
              <View style={{ marginTop: 12 }}>
                {[
                  { label: 'Infant',  sub: '0–6 months', val: infantSeats,  set: setInfantSeats },
                  { label: 'Toddler', sub: '0–4 yrs',    val: toddlerSeats, set: setToddlerSeats },
                  { label: 'Booster', sub: '4–8 yrs',    val: boosterSeats, set: setBoosterSeats },
                ].map(({ label, sub, val, set }) => (
                  <View key={label} style={s.babySeatRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.babySeatLabel}>{label}</Text>
                      <Text style={s.babySeatSub}>{sub}</Text>
                    </View>
                    <Stepper value={val} min={0} max={3} onChange={v => { set(v); clearQuote(); }} />
                  </View>
                ))}
                {seatError && (
                  <Text style={s.errorText}>Baby seats ({totalSeats}) must be less than total passengers ({passengers})</Text>
                )}
              </View>
            )}
          </View>

          {/* ── Get Quote Button ── */}
          <TouchableOpacity
            style={[s.goldBtn, (quoting || !pickup || !date || !time || seatError) && s.goldBtnDisabled]}
            disabled={quoting || !pickup || !date || !time || seatError}
            onPress={handleGetQuote}
          >
            {quoting
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={s.goldBtnText}>{quoteResults.length > 0 ? '↻ Recalculate' : 'Get Quote →'}</Text>
            }
          </TouchableOpacity>

          {/* ── Quote Results ── */}
          {quoteResults.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[s.sectionLabel, { textAlign: 'center', marginBottom: 12 }]}>SELECT YOUR VEHICLE</Text>
              {quoteResults.map(result => {
                const isSelected = selectedServiceClassId === result.service_class_id;
                const preview    = result.pricing_snapshot_preview;
                const hasDiscount = (result.discount?.discount_minor ?? 0) > 0;
                return (
                  <TouchableOpacity key={result.service_class_id} style={[s.resultCard, isSelected && s.resultCardSelected]}
                    onPress={() => setSelectedServiceClassId(result.service_class_id)}>
                    <View style={s.resultCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.resultName}>{result.service_class_name}</Text>
                        {preview.minimum_applied && (
                          <Text style={s.resultMinimum}>Minimum fare applied</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {hasDiscount && preview.pre_discount_total_minor && (
                          <Text style={s.resultOldPrice}>{fmtMoney(preview.pre_discount_total_minor, currency)}</Text>
                        )}
                        <Text style={[s.resultPrice, isSelected && { color: GOLD }]}>
                          {fmtMoney(result.estimated_total_minor, currency)}
                        </Text>
                        {hasDiscount && result.discount && (
                          <Text style={s.resultDiscount}>-{fmtMoney(result.discount.discount_minor, currency)} off</Text>
                        )}
                        {!hasDiscount && <Text style={s.resultCurrency}>{currency} incl. GST</Text>}
                      </View>
                      <View style={[s.radioCircle, isSelected && s.radioCircleSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#000" />}
                      </View>
                    </View>
                    {/* Extras */}
                    <View style={s.resultExtras}>
                      {(preview.toll_parking_minor ?? 0) > 0 && (
                        <Text style={s.extraTag}>Incl. {fmtMoney(preview.toll_parking_minor, currency)} tolls</Text>
                      )}
                      {(preview.waypoints_minor ?? 0) > 0 && (
                        <Text style={s.extraTag}>+{fmtMoney(preview.waypoints_minor!, currency)} stops</Text>
                      )}
                      {(preview.baby_seats_minor ?? 0) > 0 && (
                        <Text style={s.extraTag}>+{fmtMoney(preview.baby_seats_minor!, currency)} seats</Text>
                      )}
                      {(preview.surcharge_labels?.length ?? 0) > 0 && (
                        <Text style={[s.extraTag, { color: GOLD }]}>{preview.surcharge_labels!.join(', ')} surcharge</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Book Now */}
              <TouchableOpacity
                style={[s.goldBtn, (!selectedServiceClassId || !quoteId || booking) && s.goldBtnDisabled]}
                disabled={!selectedServiceClassId || !quoteId || booking}
                onPress={() => {
                  if (selectedServiceClassId && quoteId) {
                    bookNow({ quote_id: quoteId, service_class_id: selectedServiceClassId });
                  }
                }}
              >
                {booking
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.goldBtnText}>
                      {selectedResult
                        ? `Book Now — ${fmtMoney(selectedResult.estimated_total_minor, currency)}`
                        : 'Select a vehicle'}
                    </Text>
                }
              </TouchableOpacity>

              <Text style={s.footNote}>Fare is an estimate. Quote valid 30 minutes.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <CityPickerModal
        visible={showCityPicker}
        cities={cities}
        selectedId={effectiveCityId}
        onSelect={id => { setCityId(id); clearQuote(); }}
        onClose={() => setShowCityPicker(false)}
      />
      <CalendarModal
        visible={showCalendar}
        value={date}
        minDate={todayStr()}
        onConfirm={v => { setDate(v); clearQuote(); }}
        onClose={() => setShowCalendar(false)}
      />
      <TimeModal
        visible={showTimePicker}
        value={time}
        onConfirm={v => { setTime(v); clearQuote(); }}
        onClose={() => setShowTimePicker(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: BG },
  center:   { alignItems: 'center', justifyContent: 'center' },
  scroll:   { padding: 16 },

  pageTitle: { fontSize: 28, fontWeight: '700', color: TEXT, marginBottom: 20 },

  card: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 0.5,
    borderColor: BORDER, padding: 16, marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: MUTED,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },

  // City / service select
  selectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderColor: BORDER, borderRadius: 10,
    padding: 12, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  selectText: { flex: 1, color: TEXT, fontSize: 14 },

  // Chips
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  chipActive:     { backgroundColor: GOLD, borderColor: GOLD },
  chipText:       { color: MUTED, fontSize: 13 },
  chipTextActive: { color: '#000', fontWeight: '700' },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 0.5, borderColor: BORDER, alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: GOLD, borderColor: GOLD },
  toggleText:      { color: MUTED, fontSize: 14 },
  toggleTextActive: { color: '#000', fontWeight: '700' },

  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  durationLabel: { color: MUTED, fontSize: 14 },

  // Input
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
  inputIcon: { marginLeft: 12 },
  textInput: { flex: 1, color: TEXT, fontSize: 14, padding: 12 },
  removeBtn: { padding: 10 },

  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingLeft: 4 },
  addStopText: { color: GOLD, fontSize: 13, fontWeight: '600' },

  // Date/time
  dateTimeRow: { flexDirection: 'row' },
  dateTimeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderColor: BORDER, borderRadius: 10,
    padding: 12, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dateTimeText: { color: TEXT, fontSize: 13, flexShrink: 1 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, overflow: 'hidden' },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  stepBtnText: { color: TEXT, fontSize: 20, lineHeight: 24 },
  stepValue: { flex: 1, textAlign: 'center', color: TEXT, fontSize: 15, fontWeight: '600' },

  // Baby seats
  babySeatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  babySeatLabel: { color: TEXT, fontSize: 13, fontWeight: '500' },
  babySeatSub:   { color: MUTED, fontSize: 11, marginTop: 2 },

  // Row util
  row: { flexDirection: 'row', alignItems: 'center' },

  errorText: { color: RED, fontSize: 12, marginTop: 8 },

  // Gold button
  goldBtn: {
    backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  goldBtnDisabled: { opacity: 0.5 },
  goldBtnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Quote results
  resultCard: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 0.5,
    borderColor: BORDER, padding: 16, marginBottom: 10,
  },
  resultCardSelected: { borderColor: GOLD, backgroundColor: 'rgba(200,168,112,0.06)' },
  resultCardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  resultName:         { color: TEXT, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  resultMinimum:      { color: MUTED, fontSize: 11 },
  resultPrice:        { color: TEXT, fontSize: 20, fontWeight: '700' },
  resultOldPrice:     { color: MUTED, fontSize: 12, textDecorationLine: 'line-through' },
  resultDiscount:     { color: '#34D399', fontSize: 11, fontWeight: '600' },
  resultCurrency:     { color: MUTED, fontSize: 11 },
  resultExtras:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  extraTag:           { color: MUTED, fontSize: 11 },

  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: BORDER, alignItems: 'center', justifyContent: 'center',
  },
  radioCircleSelected: { backgroundColor: GOLD, borderColor: GOLD },

  footNote: { color: MUTED, fontSize: 11, textAlign: 'center', marginTop: 12 },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },

  // Calendar
  calModal: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 0.5,
    borderColor: BORDER, padding: 16, width: '100%', maxWidth: 340,
  },
  calHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn:      { padding: 6 },
  calMonthTitle:  { color: TEXT, fontSize: 15, fontWeight: '600' },
  calDayHeaders:  { flexDirection: 'row', marginBottom: 4 },
  calDayHeader:   { flex: 1, textAlign: 'center', color: MUTED, fontSize: 11, fontWeight: '600' },
  calGrid:        { flexDirection: 'row', flexWrap: 'wrap' },
  calCellEmpty:   { width: `${100/7}%`, aspectRatio: 1 },
  calCell:        { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 99 },
  calCellSelected: { backgroundColor: GOLD },
  calCellToday:   { borderWidth: 1, borderColor: GOLD },
  calCellDisabled: { opacity: 0.2 },
  calCellText:    { color: TEXT, fontSize: 13 },
  calCellTextSelected: { color: '#000', fontWeight: '700' },
  calCellTextDisabled: { color: MUTED },
  calConfirmBtn:  { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  calConfirmText: { color: '#000', fontWeight: '700', fontSize: 14 },

  // Time
  timeModal: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 0.5,
    borderColor: BORDER, padding: 16, width: '100%', maxWidth: 300,
  },
  timeTitle: { color: TEXT, fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  timeRow:   { flexDirection: 'row', gap: 4 },
  timeCol:   { flex: 1 },
  timeColLabel: { color: MUTED, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 6 },
  timeList:  { height: 160 },
  timeItem:  { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  timeItemSelected: { backgroundColor: GOLD },
  timeItemText: { color: MUTED, fontSize: 14 },
  timeItemTextSelected: { color: '#000', fontWeight: '700' },

  // Picker modal
  pickerModal: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 0.5,
    borderColor: BORDER, padding: 16, width: '100%', maxWidth: 360,
  },
  pickerTitle: { color: TEXT, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  pickerItem:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  pickerItemSelected: { backgroundColor: 'rgba(200,168,112,0.08)' },
  pickerItemText:     { color: TEXT, fontSize: 15 },
  pickerItemTextSelected: { color: GOLD, fontWeight: '600' },
});
