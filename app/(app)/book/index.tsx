/**
 * Book Screen — 1:1 React Native port of BookingWidget.tsx
 * Same API calls, same flow, same fields.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, FlatList, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api from '../../../src/lib/api';
import { BG, CARD, BORDER, TEXT, MUTED, GOLD, SUCCESS, WARNING, ERROR } from '../../../src/lib/format';

const API_URL = 'https://chauffeur-saas-production.up.railway.app';
const TENANT  = 'aschauffeured';

// ── Types ─────────────────────────────────────────────────────────────────
type City        = { id: string; name: string; timezone: string; lat?: number; lng?: number };
type ServiceType = { id: string; code: string; name: string; calculation_type: string; minimum_hours?: number | null; surge_multiplier?: number | null };
type CarType     = { id: string; name: string; description?: string | null; max_passengers?: number | null; luggage_capacity?: number | null; vehicle_class?: string | null };
type QuoteResult = {
  service_class_id: string; service_class_name: string;
  estimated_total_minor: number; currency: string;
  discount?: { name: string; value: number; discount_minor: number } | null;
  pricing_snapshot_preview: {
    base_calculated_minor: number; toll_parking_minor: number;
    surcharge_labels?: string[]; pre_discount_total_minor?: number;
    discount_amount_minor: number; grand_total_minor: number; minimum_applied: boolean;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtMoney(minor: number, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(minor / 100);
}
const todayISO = () => new Date().toISOString().slice(0, 10);
const isHourly = (st?: ServiceType) => st?.calculation_type === 'HOURLY_CHARTER';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['SU','MO','TU','WE','TH','FR','SA'];

function fmtDisplayDate(s: string) {
  if (!s) return '';
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y,m-1,d);
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m-1].slice(0,3)} ${y}`;
}
function fmtDisplayTime(s: string) {
  if (!s) return '';
  const [h24,m] = s.split(':').map(Number);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
}

// ── Stepper ───────────────────────────────────────────────────────────────
function Stepper({ value, onChange, min = 0, max = 50, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Text style={[styles.stepperBtnText, value <= min && { opacity: 0.3 }]}>−</Text>
      </TouchableOpacity>
      <View style={styles.stepperCenter}>
        <Text style={styles.stepperValue}>{value}</Text>
        {suffix ? <Text style={styles.stepperSuffix}>{suffix}</Text> : null}
      </View>
      <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Text style={[styles.stepperBtnText, value >= max && { opacity: 0.3 }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Calendar picker modal ────────────────────────────────────────────────
function CalendarModal({ visible, value, onSelect, onClose, minDate }: {
  visible: boolean; value: string; onSelect: (v: string) => void; onClose: () => void; minDate?: string;
}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const minD = minDate ? (() => { const [y,m,d] = minDate.split('-').map(Number); return new Date(y,m-1,d); })() : today;
  const initSel = value ? (() => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); })() : minD;
  const [view, setView] = useState(new Date(initSel.getFullYear(), initSel.getMonth(), 1));

  const year = view.getFullYear(); const month = view.getMonth();
  const firstDow = new Date(year,month,1).getDay();
  const daysInM = new Date(year,month+1,0).getDate();
  const cells: (number|null)[] = [...Array(firstDow).fill(null), ...Array.from({length:daysInM},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.calendarPanel} activeOpacity={1} onPress={e => e.stopPropagation()}>
          {/* Month nav */}
          <View style={styles.calNavRow}>
            <TouchableOpacity onPress={() => setView(v => new Date(v.getFullYear(),v.getMonth()-1,1))} style={styles.calNavBtn}>
              <Ionicons name="chevron-back" size={16} color={MUTED} />
            </TouchableOpacity>
            <Text style={styles.calMonthText}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={() => setView(v => new Date(v.getFullYear(),v.getMonth()+1,1))} style={styles.calNavBtn}>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>
          {/* Day headers */}
          <View style={styles.calDayRow}>
            {DAYS.map(d => <Text key={d} style={styles.calDayHeader}>{d}</Text>)}
          </View>
          {/* Date cells */}
          <View style={styles.calGrid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.calCell} />;
              const cellDate = new Date(year,month,day);
              const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const disabled = cellDate < minD;
              const selected = value === iso;
              const isToday = todayISO() === iso;
              return (
                <TouchableOpacity key={i} style={styles.calCell} disabled={disabled} onPress={() => { onSelect(iso); onClose(); }}>
                  <View style={[styles.calDayBtn, selected && styles.calDayBtnSelected, isToday && !selected && styles.calDayBtnToday]}>
                    <Text style={[styles.calDayText, disabled && { opacity: 0.2 }, selected && { color: '#000', fontWeight: '700' }, isToday && !selected && { color: GOLD }]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Time picker modal ────────────────────────────────────────────────────
function TimeModal({ visible, value, onSelect, onClose }: {
  visible: boolean; value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  const initH24 = value ? parseInt(value.split(':')[0]) : 9;
  const initM   = value ? Math.round(parseInt(value.split(':')[1]) / 5) * 5 : 0;
  const initP   = initH24 >= 12 ? 'PM' : 'AM';
  const initH12 = initH24 % 12 === 0 ? 12 : initH24 % 12;
  const [hour, setHour]     = useState(initH12);
  const [minute, setMinute] = useState(initM);
  const [period, setPeriod] = useState<'AM'|'PM'>(initP as any);

  const commit = (h: number, m: number, p: 'AM'|'PM') => {
    const h24 = p === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    onSelect(`${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  const hours   = Array.from({length:12},(_,i)=>i+1);
  const minutes = Array.from({length:12},(_,i)=>i*5);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.timePanel} activeOpacity={1}>
          <View style={styles.timeColsRow}>
            <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
              {hours.map(h => (
                <TouchableOpacity key={h} style={[styles.timeItem, hour===h && styles.timeItemSel]}
                  onPress={() => { setHour(h); commit(h,minute,period); }}>
                  <Text style={[styles.timeItemText, hour===h && styles.timeItemTextSel]}>{String(h).padStart(2,'0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
              {minutes.map(m => (
                <TouchableOpacity key={m} style={[styles.timeItem, minute===m && styles.timeItemSel]}
                  onPress={() => { setMinute(m); commit(hour,m,period); }}>
                  <Text style={[styles.timeItemText, minute===m && styles.timeItemTextSel]}>{String(m).padStart(2,'0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.timeCol}>
              {(['AM','PM'] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.timeItem, period===p && styles.timeItemSel]}
                  onPress={() => { setPeriod(p); commit(hour,minute,p); }}>
                  <Text style={[styles.timeItemText, period===p && styles.timeItemTextSel]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.timeConfirmBtn} onPress={() => { commit(hour,minute,period); onClose(); }}>
            <Text style={styles.timeConfirmText}>Confirm</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Picker modal (city / service type / duration) ─────────────────────────
function PickerModal({ visible, title, options, value, onSelect, onClose }: {
  visible: boolean; title: string; options: {label:string;value:string}[];
  value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerPanel}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={i => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, item.value === value && styles.pickerItemSel]}
                onPress={() => { onSelect(item.value); onClose(); }}>
                <Text style={[styles.pickerItemText, item.value === value && styles.pickerItemTextSel]}>{item.label}</Text>
                {item.value === value && <Ionicons name="checkmark" size={16} color={GOLD} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function BookScreen() {
  // Config
  const [cities, setCities]             = useState<City[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [carTypes, setCarTypes]         = useState<CarType[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError]   = useState(false);
  const [autoDiscount, setAutoDiscount] = useState<{name:string;rate:number}|null>(null);

  // Form
  const [cityId, setCityId]               = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [tripType, setTripType]           = useState<'ONE_WAY'|'RETURN'>('ONE_WAY');
  const [pickup, setPickup]               = useState('');
  const [dropoff, setDropoff]             = useState('');
  const [waypoints, setWaypoints]         = useState<string[]>([]);
  const [date, setDate]                   = useState('');
  const [time, setTime]                   = useState('');
  const [returnDate, setReturnDate]       = useState('');
  const [returnTime, setReturnTime]       = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [passengers, setPassengers]       = useState(1);
  const [luggage, setLuggage]             = useState(0);
  const [infantSeats, setInfantSeats]     = useState(0);
  const [toddlerSeats, setToddlerSeats]   = useState(0);
  const [boosterSeats, setBoosterSeats]   = useState(0);

  // Quote
  const [quoting, setQuoting]               = useState(false);
  const [quoteId, setQuoteId]               = useState<string|null>(null);
  const [quoteResults, setQuoteResults]     = useState<QuoteResult[]>([]);
  const [selectedCarId, setSelectedCarId]   = useState<string|null>(null);
  const [currency, setCurrency]             = useState('AUD');
  const [booking, setBooking]               = useState(false);

  // Modals
  const [showCity, setShowCity]           = useState(false);
  const [showService, setShowService]     = useState(false);
  const [showDuration, setShowDuration]   = useState(false);
  const [showDate, setShowDate]           = useState(false);
  const [showTime, setShowTime]           = useState(false);
  const [showReturnDate, setShowReturnDate] = useState(false);
  const [showReturnTime, setShowReturnTime] = useState(false);
  const [showTripType, setShowTripType]   = useState(false);
  const [showUrgent, setShowUrgent]       = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const selectedServiceType = serviceTypes.find(s => s.id === serviceTypeId);
  const selectedCity        = cities.find(c => c.id === cityId);
  const isHourlyMode = isHourly(selectedServiceType);
  const minHours = selectedServiceType?.minimum_hours ?? (isHourlyMode ? 2 : null);
  const totalSeats = infantSeats + toddlerSeats + boosterSeats;

  const clearQuote = useCallback(() => { setQuoteId(null); setQuoteResults([]); setSelectedCarId(null); }, []);

  // Load config
  const loadConfig = useCallback(async () => {
    setConfigError(false); setLoadingConfig(true);
    try {
      const [cr, sr] = await Promise.all([
        fetch(`${API_URL}/public/cities?tenant_slug=${TENANT}`),
        fetch(`${API_URL}/public/service-types?tenant_slug=${TENANT}`),
      ]);
      const [c, s] = await Promise.all([cr.json(), sr.json()]);
      const validCities = Array.isArray(c) ? c : [];
      const validSt = (Array.isArray(s) ? s : []).filter((x: any) => x.name);
      setCities(validCities); setServiceTypes(validSt);
      if (validCities.length > 0) setCityId(validCities[0].id);
      if (validSt.length > 0) setServiceTypeId(validSt[0].id);
      // Auto-discount
      try {
        const dr = await fetch(`${API_URL}/public/discounts/auto?tenant_slug=${TENANT}`);
        const d = await dr.json();
        if (d?.name && d?.discount_value) setAutoDiscount({ name: d.name, rate: Number(d.discount_value) });
      } catch {}
    } catch { setConfigError(true); }
    finally { setLoadingConfig(false); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Get Quote
  const handleGetQuote = async () => {
    if (!pickup || !date || !time) {
      Alert.alert('Missing fields', 'Please fill in pickup location, date and time.'); return;
    }
    const pickupMs = new Date(`${date}T${time}:00`).getTime();
    if (pickupMs - Date.now() < 12 * 60 * 60 * 1000) { setShowUrgent(true); return; }
    if (tripType === 'RETURN' && (!returnDate || !returnTime)) {
      Alert.alert('Missing fields', 'Please fill in return date and time.'); return;
    }
    if (totalSeats >= passengers) {
      Alert.alert('Seat error', 'Baby seats must be less than total passengers.'); return;
    }

    setQuoting(true); clearQuote();
    try {
      const effectiveDropoff = dropoff || pickup;
      const pickupAtUtc = new Date(`${date}T${time}:00`).toISOString();

      // Route
      const rp = new URLSearchParams({ tenant_slug: TENANT, origin: pickup, destination: effectiveDropoff, pickup_at: pickupAtUtc });
      const rr = await fetch(`${API_URL}/public/maps/route?${rp}`);
      if (!rr.ok) throw new Error('Failed to calculate route');
      const route = await rr.json();

      const body: Record<string,any> = {
        service_type_id: serviceTypeId,
        city_id: cityId || undefined,
        trip_mode: isHourlyMode ? 'ONE_WAY' : tripType,
        pickup_address: pickup,
        dropoff_address: effectiveDropoff,
        pickup_at_utc: pickupAtUtc,
        timezone: selectedCity?.timezone ?? 'Australia/Sydney',
        passenger_count: passengers,
        luggage_count: luggage,
        distance_km: route.distance_km,
        duration_minutes: route.duration_minutes,
        waypoints_count: waypoints.filter(Boolean).length,
        waypoints: waypoints.filter(Boolean),
        infant_seats: infantSeats,
        toddler_seats: toddlerSeats,
        booster_seats: boosterSeats,
      };
      if (isHourlyMode) body.duration_hours = durationHours;
      if (tripType === 'RETURN') {
        body.return_distance_km = route.distance_km;
        body.return_duration_minutes = route.duration_minutes;
        body.return_date = returnDate;
        body.return_time = returnTime;
      }

      const qr = await fetch(`${API_URL}/public/pricing/quote?tenant_slug=${TENANT}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!qr.ok) throw new Error('Failed to get quote');
      const quote = await qr.json();
      setQuoteId(quote.quote_id);
      setQuoteResults(quote.results ?? []);
      setCurrency(quote.currency ?? 'AUD');
      if (quote.results?.length > 0) setSelectedCarId(quote.results[0].service_class_id);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      Alert.alert('Quote failed', e.message ?? 'Please try again.');
    } finally { setQuoting(false); }
  };

  // Book Now
  const handleBookNow = async () => {
    if (!quoteId || !selectedCarId) return;
    setBooking(true);
    try {
      const res = await api.post('/customer-portal/bookings/create-from-quote', {
        quote_id: quoteId, service_class_id: selectedCarId,
      });
      const bookingId = res.data?.id ?? res.data?.booking?.id;
      router.push(bookingId ? `/(app)/bookings/${bookingId}` : '/(app)/bookings');
    } catch (e: any) {
      Alert.alert('Booking failed', e?.response?.data?.message ?? 'Please try again.');
    } finally { setBooking(false); }
  };

  if (loadingConfig) {
    return (
      <SafeAreaView style={[styles.safe, {alignItems:'center',justifyContent:'center'}]}>
        <ActivityIndicator color={GOLD} size="large" />
      </SafeAreaView>
    );
  }

  if (configError) {
    return (
      <SafeAreaView style={[styles.safe, {alignItems:'center',justifyContent:'center',padding:24}]}>
        <Text style={{color:TEXT,fontSize:15,marginBottom:16,textAlign:'center'}}>Unable to load booking options</Text>
        <TouchableOpacity style={styles.goldBtn} onPress={loadConfig}>
          <Text style={styles.goldBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const durationOptions = [2,3,4,5,6,7,8,9,10,12].filter(h => h >= (minHours ?? 2)).map(h => ({ label: `${h} hours${h===minHours?' (minimum)':''}`, value: String(h) }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Title */}
        <Text style={styles.pageTitle}>Book a Ride</Text>

        {/* Auto-discount banner */}
        {autoDiscount && (
          <View style={styles.discountBanner}>
            <View style={styles.discountIcon}>
              <Ionicons name="checkmark" size={14} color={SUCCESS} />
            </View>
            <View style={{flex:1}}>
              <Text style={styles.discountTitle}>{autoDiscount.rate}% {autoDiscount.name}</Text>
              <Text style={styles.discountSub}>Applied automatically — no code needed</Text>
            </View>
          </View>
        )}

        {/* Form card */}
        <View style={styles.formCard}>

          {/* City + Service Type */}
          <View style={styles.row2}>
            <View style={{flex:1}}>
              <Text style={styles.fl}>CITY</Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowCity(true)}>
                <Text style={styles.selectText}>{cities.find(c=>c.id===cityId)?.name ?? 'Select city'}</Text>
                <Ionicons name="chevron-down" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View style={{flex:1}}>
              <Text style={styles.fl}>SERVICE TYPE</Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowService(true)}>
                <Text style={styles.selectText} numberOfLines={1}>{serviceTypes.find(s=>s.id===serviceTypeId)?.name ?? 'Select'}</Text>
                <Ionicons name="chevron-down" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hourly minimum notice */}
          {isHourlyMode && minHours && (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>✦  Hourly Charter minimum is {minHours} hours.</Text>
            </View>
          )}

          {/* Trip type / Duration */}
          {isHourlyMode ? (
            <View>
              <Text style={styles.fl}>DURATION (HOURS)</Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowDuration(true)}>
                <Text style={styles.selectText}>{durationHours} hours{durationHours===minHours?' (minimum)':''}</Text>
                <Ionicons name="chevron-down" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.fl}>TRIP TYPE</Text>
              <TouchableOpacity style={styles.select} onPress={() => {
                setShowTripType(true);
              }}>
                <Text style={styles.selectText}>{tripType === 'ONE_WAY' ? 'One Way' : 'Return'}</Text>
                <Ionicons name="chevron-down" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>
          )}

          {/* Pickup Date & Time */}
          <View>
            <Text style={styles.fl}>PICKUP DATE & TIME</Text>
            <View style={styles.row2}>
              <TouchableOpacity style={[styles.select,{flex:1}]} onPress={() => setShowDate(true)}>
                <Ionicons name="calendar-outline" size={14} color={MUTED} />
                <Text style={[styles.selectText,{flex:1}]}>{date ? fmtDisplayDate(date) : 'Select date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.select,{flex:1}]} onPress={() => setShowTime(true)}>
                <Ionicons name="time-outline" size={14} color={MUTED} />
                <Text style={[styles.selectText,{flex:1}]}>{time ? fmtDisplayTime(time) : 'Select time'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pickup address */}
          <View>
            <Text style={styles.fl}><Text style={{color:SUCCESS}}>◉</Text>  PICKUP LOCATION</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location" size={16} color={SUCCESS} style={{marginRight:8}} />
              <TextInput style={styles.input} value={pickup} onChangeText={v => { setPickup(v); clearQuote(); }}
                placeholder="Airport, hotel or address..." placeholderTextColor={MUTED+'80'} />
            </View>
          </View>

          {/* Waypoints */}
          {waypoints.map((wp, idx) => (
            <View key={idx}>
              <Text style={styles.fl}>STOP {idx+1}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="location-outline" size={16} color={MUTED} style={{marginRight:8}} />
                <TextInput style={[styles.input,{flex:1}]} value={wp}
                  onChangeText={v => { const n=[...waypoints]; n[idx]=v; setWaypoints(n); clearQuote(); }}
                  placeholder="Intermediate stop..." placeholderTextColor={MUTED+'80'} />
                <TouchableOpacity onPress={() => { setWaypoints(w=>w.filter((_,i)=>i!==idx)); clearQuote(); }}>
                  <Ionicons name="close-circle" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {waypoints.length < 5 && (
            <TouchableOpacity style={styles.addStopBtn} onPress={() => setWaypoints(w => [...w, ''])}>
              <Ionicons name="add-circle-outline" size={14} color={GOLD} />
              <Text style={styles.addStopText}>Add Stop</Text>
            </TouchableOpacity>
          )}

          {/* Dropoff */}
          <View>
            <Text style={styles.fl}><Text style={{color:GOLD}}>◉</Text>  DROP-OFF LOCATION <Text style={{color:MUTED+'60',fontWeight:'400',textTransform:'none'}}>(optional)</Text></Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location" size={16} color={GOLD} style={{marginRight:8}} />
              <TextInput style={styles.input} value={dropoff} onChangeText={v => { setDropoff(v); clearQuote(); }}
                placeholder="Airport, hotel or destination..." placeholderTextColor={MUTED+'80'} />
              {dropoff ? <TouchableOpacity onPress={() => { setDropoff(''); clearQuote(); }}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity> : null}
            </View>
          </View>

          {/* Return trip */}
          {tripType === 'RETURN' && !isHourlyMode && (
            <View style={styles.returnSection}>
              <Text style={[styles.fl, {color:GOLD}]}>RETURN TRIP</Text>
              <View style={styles.row2}>
                <TouchableOpacity style={[styles.select,{flex:1}]} onPress={() => setShowReturnDate(true)}>
                  <Ionicons name="calendar-outline" size={14} color={MUTED} />
                  <Text style={[styles.selectText,{flex:1}]}>{returnDate ? fmtDisplayDate(returnDate) : 'Return date'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.select,{flex:1}]} onPress={() => setShowReturnTime(true)}>
                  <Ionicons name="time-outline" size={14} color={MUTED} />
                  <Text style={[styles.selectText,{flex:1}]}>{returnTime ? fmtDisplayTime(returnTime) : 'Return time'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.returnNote}>Return pickup from drop-off location.</Text>
            </View>
          )}

          {/* Passengers + Luggage */}
          <View style={styles.row2}>
            <View style={{flex:1}}>
              <Text style={styles.fl}>PASSENGERS</Text>
              <Stepper value={passengers} onChange={v=>{setPassengers(v);clearQuote();}} min={1} max={50} suffix={passengers===1?'passenger':'passengers'} />
            </View>
            <View style={{flex:1}}>
              <Text style={styles.fl}>LUGGAGE</Text>
              <Stepper value={luggage} onChange={v=>{setLuggage(v);clearQuote();}} min={0} max={50} suffix={luggage===1?'bag':'bags'} />
            </View>
          </View>

          {/* Baby Seats */}
          <View>
            <Text style={styles.fl}>BABY SEATS <Text style={{color:MUTED+'60',fontWeight:'400',textTransform:'none'}}>(optional)</Text></Text>
            <View style={styles.row3}>
              {[
                { label:'Infant', sub:'0–6 months', val:infantSeats, set:setInfantSeats },
                { label:'Toddler', sub:'0–4 yrs', val:toddlerSeats, set:setToddlerSeats },
                { label:'Booster', sub:'4–8 yrs', val:boosterSeats, set:setBoosterSeats },
              ].map(({label,sub,val,set}) => (
                <View key={label} style={{flex:1}}>
                  <Text style={styles.seatLabel}>{label}</Text>
                  <Text style={styles.seatSub}>{sub}</Text>
                  <View style={styles.seatStepper}>
                    <TouchableOpacity onPress={() => { set(Math.max(0,val-1)); clearQuote(); }}>
                      <Text style={styles.seatBtn}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.seatVal}>{val}</Text>
                    <TouchableOpacity onPress={() => { set(Math.min(3,val+1)); clearQuote(); }}>
                      <Text style={styles.seatBtn}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            {totalSeats > 0 && totalSeats >= passengers && (
              <Text style={{color:ERROR,fontSize:11,marginTop:6}}>Baby seats ({totalSeats}) must be less than total passengers ({passengers})</Text>
            )}
          </View>

          {/* Get Quote CTA */}
          <TouchableOpacity style={[styles.goldBtn, (quoting||totalSeats>=passengers) && {opacity:0.5}]}
            onPress={handleGetQuote} disabled={quoting || totalSeats >= passengers}>
            {quoting
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.goldBtnText}>{quoteResults.length > 0 ? '↻ Recalculate' : 'Get Instant Quote'} →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Quote results */}
        {quoteResults.length > 0 && (
          <View style={{marginTop:16}}>
            <Text style={styles.sectionLabel}>Select Your Vehicle</Text>
            {quoteResults.map(result => {
              const ct = carTypes.find(c => c.id === result.service_class_id);
              const isSel = selectedCarId === result.service_class_id;
              const preview = result.pricing_snapshot_preview;
              const hasDiscount = (result.discount?.discount_minor ?? 0) > 0;

              return (
                <TouchableOpacity key={result.service_class_id}
                  style={[styles.carCard, isSel && styles.carCardSel]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCarId(result.service_class_id); }}
                  activeOpacity={0.8}
                >
                  {/* Top: name + price + radio */}
                  <View style={styles.row}>
                    <View style={{flex:1}}>
                      {ct?.vehicle_class && (
                        <View style={styles.classBadge}><Text style={styles.classBadgeText}>{ct.vehicle_class}</Text></View>
                      )}
                      <Text style={styles.carName}>{result.service_class_name}</Text>
                    </View>
                    <View style={{alignItems:'flex-end',marginLeft:12}}>
                      {hasDiscount && preview.pre_discount_total_minor && (
                        <Text style={styles.strikePrice}>{fmtMoney(preview.pre_discount_total_minor, result.currency)}</Text>
                      )}
                      <Text style={[styles.carPrice, isSel && {color:GOLD}]}>{fmtMoney(result.estimated_total_minor, result.currency)}</Text>
                      {hasDiscount && result.discount ? (
                        <Text style={styles.discountLabel}>-{fmtMoney(result.discount.discount_minor, result.currency)} off</Text>
                      ) : (
                        <Text style={styles.currencyLabel}>{result.currency} incl. GST</Text>
                      )}
                    </View>
                    <View style={[styles.radio, isSel && styles.radioSel]}>
                      {isSel && <Ionicons name="checkmark" size={12} color="#000" />}
                    </View>
                  </View>

                  {/* Specs */}
                  <View style={[styles.specsRow, {marginTop:12}]}>
                    {(ct?.max_passengers ?? 0) > 0 && (
                      <View style={styles.spec}>
                        <Ionicons name="people-outline" size={11} color={MUTED+'B3'} />
                        <Text style={styles.specText}>Up to {ct!.max_passengers} pax</Text>
                      </View>
                    )}
                    {(ct?.luggage_capacity ?? 0) > 0 && (
                      <View style={styles.spec}>
                        <Ionicons name="briefcase-outline" size={11} color={MUTED+'B3'} />
                        <Text style={styles.specText}>{ct!.luggage_capacity} bags</Text>
                      </View>
                    )}
                    {preview.toll_parking_minor > 0 && (
                      <Text style={styles.specText}>Incl. {fmtMoney(preview.toll_parking_minor, currency)} tolls</Text>
                    )}
                    {(preview.surcharge_labels?.length ?? 0) > 0 && (
                      <Text style={[styles.specText,{color:WARNING+'CC'}]}>{preview.surcharge_labels!.join(', ')} surcharge incl.</Text>
                    )}
                  </View>

                  {ct?.description && <Text style={styles.carDesc} numberOfLines={1}>{ct.description}</Text>}
                </TouchableOpacity>
              );
            })}

            {/* Book Now */}
            <TouchableOpacity style={[styles.goldBtn, (!selectedCarId||booking) && {opacity:0.5}]}
              onPress={handleBookNow} disabled={!selectedCarId || booking}>
              {booking
                ? <ActivityIndicator color="#000" size="small" />
                : (() => {
                    const r = quoteResults.find(q => q.service_class_id === selectedCarId);
                    const hasDiscount = (r?.discount?.discount_minor ?? 0) > 0;
                    return (
                      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                        <Text style={styles.goldBtnText}>Book Now</Text>
                        {r && (
                          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                            <Text style={styles.goldBtnText}>—</Text>
                            {hasDiscount && r.pricing_snapshot_preview.pre_discount_total_minor && (
                              <Text style={[styles.goldBtnText,{textDecorationLine:'line-through',opacity:0.6,fontSize:13}]}>
                                {fmtMoney(r.pricing_snapshot_preview.pre_discount_total_minor, currency)}
                              </Text>
                            )}
                            <Text style={[styles.goldBtnText, hasDiscount && {color:'#86efac'}]}>
                              {fmtMoney(r.estimated_total_minor, currency)}
                            </Text>
                          </View>
                        )}
                        <Ionicons name="arrow-forward" size={16} color="#000" />
                      </View>
                    );
                  })()
              }
            </TouchableOpacity>
            <Text style={styles.disclaimer}>Fare is an estimate. Final price confirmed at booking. Quote valid for 30 minutes.</Text>
          </View>
        )}

        <View style={{height:120}} />
      </ScrollView>

      {/* Modals */}
      <PickerModal visible={showTripType} title="Trip Type" options={[{label:'One Way',value:'ONE_WAY'},{label:'Return',value:'RETURN'}]} value={tripType}
        onSelect={v=>{setTripType(v as any);clearQuote();}} onClose={()=>setShowTripType(false)} />
      <PickerModal visible={showCity} title="Select City" options={cities.map(c=>({label:c.name,value:c.id}))} value={cityId}
        onSelect={v=>{setCityId(v);clearQuote();}} onClose={()=>setShowCity(false)} />
      <PickerModal visible={showService} title="Service Type" options={serviceTypes.map(s=>({label:s.name,value:s.id}))} value={serviceTypeId}
        onSelect={v=>{setServiceTypeId(v);clearQuote();}} onClose={()=>setShowService(false)} />
      <PickerModal visible={showDuration} title="Duration" options={durationOptions} value={String(durationHours)}
        onSelect={v=>{setDurationHours(Number(v));clearQuote();}} onClose={()=>setShowDuration(false)} />

      <CalendarModal visible={showDate} value={date} onSelect={v=>{setDate(v);clearQuote();}} onClose={()=>setShowDate(false)} minDate={todayISO()} />
      <TimeModal visible={showTime} value={time} onSelect={v=>{setTime(v);clearQuote();}} onClose={()=>setShowTime(false)} />
      <CalendarModal visible={showReturnDate} value={returnDate} onSelect={v=>{setReturnDate(v);clearQuote();}} onClose={()=>setShowReturnDate(false)} minDate={date||todayISO()} />
      <TimeModal visible={showReturnTime} value={returnTime} onSelect={v=>{setReturnTime(v);clearQuote();}} onClose={()=>setShowReturnTime(false)} />

      {/* Urgent booking modal */}
      <Modal visible={showUrgent} transparent animationType="fade" onRequestClose={()=>setShowUrgent(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.urgentPanel}>
            <View style={styles.urgentIcon}>
              <Ionicons name="call" size={28} color={GOLD} />
            </View>
            <Text style={styles.urgentTitle}>Short Notice Booking</Text>
            <Text style={styles.urgentBody}>
              Bookings require at least <Text style={{color:TEXT,fontWeight:'700'}}>12 hours' notice</Text> for online reservations.
              For urgent requests, please call us directly.
            </Text>
            <TouchableOpacity style={[styles.goldBtn,{marginTop:16}]} onPress={() => { /* Linking.openURL('tel:+61280091008') */ Alert.alert('Call', '+61 2 8009 1008'); setShowUrgent(false); }}>
              <Ionicons name="call" size={16} color="#000" />
              <Text style={styles.goldBtnText}>Call Now: +61 2 8009 1008</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.urgentCancelBtn} onPress={()=>setShowUrgent(false)}>
              <Text style={styles.urgentCancelText}>Change Date & Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { padding: 16 },

  pageTitle: { fontSize: 28, fontWeight: '700', color: TEXT, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', marginBottom: 12 },

  // Auto-discount banner
  discountBanner: { flexDirection:'row', alignItems:'center', gap:12, padding:12, borderRadius:12, backgroundColor:SUCCESS+'14', borderWidth:0.5, borderColor:SUCCESS+'33', marginBottom:16 },
  discountIcon:   { width:28, height:28, borderRadius:14, backgroundColor:SUCCESS+'26', alignItems:'center', justifyContent:'center' },
  discountTitle:  { fontSize:13, fontWeight:'600', color:'#6ee7b7' },
  discountSub:    { fontSize:11, color:SUCCESS+'B3', marginTop:2 },

  // Form card
  formCard: { backgroundColor:CARD, borderRadius:16, borderWidth:0.5, borderColor:BORDER, padding:20, gap:20 },
  fl: { fontSize:10, fontWeight:'700', color:MUTED, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 },

  // Select button
  select: { flexDirection:'row', alignItems:'center', gap:8, height:48, paddingHorizontal:14, borderRadius:12, backgroundColor:BG, borderWidth:0.5, borderColor:BORDER },
  selectText: { flex:1, fontSize:14, color:TEXT },

  // Rows
  row2: { flexDirection:'row', gap:12 },
  row3: { flexDirection:'row', gap:10 },
  row:  { flexDirection:'row', alignItems:'flex-start' },

  // Notice banner
  noticeBanner: { flexDirection:'row', alignItems:'center', gap:10, padding:12, borderRadius:10, backgroundColor:WARNING+'14', borderWidth:0.5, borderColor:WARNING+'33' },
  noticeText:   { fontSize:11, color:WARNING+'CC', flex:1 },

  // Trip toggle
  tripToggle:        { flexDirection:'row', borderRadius:12, overflow:'hidden', borderWidth:0.5, borderColor:BORDER, backgroundColor:BG },
  tripToggleBtn:     { flex:1, paddingVertical:12, alignItems:'center' },
  tripToggleBtnActive:{ backgroundColor:GOLD },
  tripToggleTxt:     { fontSize:13, fontWeight:'500', color:MUTED },
  tripToggleTxtActive:{ color:'#000', fontWeight:'700' },

  // Input
  inputWrap: { flexDirection:'row', alignItems:'center', height:48, paddingHorizontal:14, borderRadius:12, backgroundColor:BG, borderWidth:0.5, borderColor:BORDER },
  input: { flex:1, fontSize:14, color:TEXT },

  // Add stop
  addStopBtn:  { flexDirection:'row', alignItems:'center', gap:6 },
  addStopText: { fontSize:12, fontWeight:'600', color:GOLD },

  // Return section
  returnSection: { paddingTop:16, borderTopWidth:0.5, borderTopColor:BORDER+'80', gap:12 },
  returnNote:    { fontSize:11, color:MUTED+'80' },

  // Stepper
  stepper:       { flexDirection:'row', alignItems:'center', height:48, borderRadius:12, borderWidth:0.5, borderColor:BORDER, backgroundColor:BG, overflow:'hidden' },
  stepperBtn:    { width:44, height:'100%', alignItems:'center', justifyContent:'center' },
  stepperBtnText:{ fontSize:20, color:TEXT, fontWeight:'300' },
  stepperCenter: { flex:1, alignItems:'center' },
  stepperValue:  { fontSize:14, fontWeight:'600', color:TEXT },
  stepperSuffix: { fontSize:10, color:MUTED+'80' },

  // Baby seats
  seatLabel:   { fontSize:11, fontWeight:'600', color:TEXT+'B3', marginBottom:2 },
  seatSub:     { fontSize:10, color:MUTED+'66', marginBottom:8, lineHeight:13 },
  seatStepper: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderRadius:10, borderWidth:0.5, borderColor:BORDER, backgroundColor:BG, padding:8 },
  seatBtn:     { fontSize:18, color:TEXT, fontWeight:'300', paddingHorizontal:6 },
  seatVal:     { fontSize:14, fontWeight:'700', color:TEXT, minWidth:20, textAlign:'center' },

  // Gold button
  goldBtn:     { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, height:52, borderRadius:14, backgroundColor:GOLD },
  goldBtnText: { fontSize:15, fontWeight:'700', color:'#000' },

  // Car cards
  carCard:     { backgroundColor:CARD, borderRadius:16, borderWidth:0.5, borderColor:BORDER, padding:16, marginBottom:10 },
  carCardSel:  { borderColor:GOLD+'B3', backgroundColor:GOLD+'0F', shadowColor:GOLD, shadowOpacity:0.12, shadowRadius:12, shadowOffset:{width:0,height:4} },
  classBadge:  { borderWidth:0.5, borderColor:GOLD+'33', borderRadius:4, paddingHorizontal:6, paddingVertical:2, alignSelf:'flex-start', marginBottom:4 },
  classBadgeText: { fontSize:9, fontWeight:'700', color:GOLD+'99', textTransform:'uppercase', letterSpacing:1 },
  carName:     { fontSize:15, fontWeight:'600', color:TEXT },
  strikePrice: { fontSize:11, color:MUTED+'66', textDecorationLine:'line-through' },
  carPrice:    { fontSize:22, fontWeight:'700', color:TEXT },
  discountLabel: { fontSize:10, fontWeight:'700', color:'#6ee7b7', marginTop:2 },
  currencyLabel: { fontSize:10, color:MUTED+'66', marginTop:2 },
  radio:       { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:BORDER, alignItems:'center', justifyContent:'center', marginLeft:12, marginTop:2 },
  radioSel:    { backgroundColor:GOLD, borderColor:GOLD },
  specsRow:    { flexDirection:'row', flexWrap:'wrap', gap:12 },
  spec:        { flexDirection:'row', alignItems:'center', gap:4 },
  specText:    { fontSize:11, color:MUTED+'B3' },
  carDesc:     { fontSize:11, color:MUTED+'66', marginTop:8 },
  disclaimer:  { fontSize:11, color:MUTED+'80', textAlign:'center', marginTop:10, lineHeight:16 },

  // Modals
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center', padding:16 },
  calendarPanel:{ backgroundColor:'#1A1A2E', borderRadius:20, padding:16, width:'100%', maxWidth:360, borderWidth:0.5, borderColor:BORDER },
  calNavRow:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:8, marginBottom:8 },
  calNavBtn:    { padding:8 },
  calMonthText: { fontSize:14, fontWeight:'600', color:TEXT },
  calDayRow:    { flexDirection:'row', marginBottom:4 },
  calDayHeader: { flex:1, textAlign:'center', fontSize:11, color:MUTED, fontWeight:'600' },
  calGrid:      { flexDirection:'row', flexWrap:'wrap' },
  calCell:      { width:'14.28%', alignItems:'center', marginVertical:2 },
  calDayBtn:    { width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center' },
  calDayBtnSelected: { backgroundColor:GOLD },
  calDayBtnToday:    { borderWidth:1, borderColor:GOLD+'66' },
  calDayText:   { fontSize:13, color:TEXT },

  timePanel:      { backgroundColor:'#1A1A2E', borderRadius:20, width:'100%', maxWidth:300, borderWidth:0.5, borderColor:BORDER, overflow:'hidden' },
  timeColsRow:    { flexDirection:'row', height:160 },
  timeCol:        { flex:1, borderRightWidth:0.5, borderRightColor:BORDER+'40' },
  timeItem:       { paddingVertical:10, alignItems:'center' },
  timeItemSel:    { backgroundColor:GOLD+'26' },
  timeItemText:   { fontSize:14, color:MUTED },
  timeItemTextSel:{ color:GOLD, fontWeight:'700' },
  timeConfirmBtn: { backgroundColor:GOLD, paddingVertical:14, alignItems:'center' },
  timeConfirmText:{ fontSize:14, fontWeight:'700', color:'#000' },

  pickerPanel:    { backgroundColor:'#222236', borderRadius:20, width:'100%', maxWidth:380, maxHeight:400, borderWidth:0.5, borderColor:BORDER, padding:16 },
  pickerTitle:    { fontSize:16, fontWeight:'700', color:TEXT, marginBottom:12 },
  pickerItem:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:14, paddingHorizontal:4, borderBottomWidth:0.5, borderBottomColor:BORDER+'40' },
  pickerItemSel:  { backgroundColor:GOLD+'14' },
  pickerItemText: { fontSize:14, color:TEXT },
  pickerItemTextSel:{ color:GOLD, fontWeight:'600' },

  urgentPanel:    { backgroundColor:'#1A1A2E', borderRadius:24, padding:28, width:'100%', maxWidth:360, borderWidth:0.5, borderColor:BORDER, alignItems:'center' },
  urgentIcon:     { width:56, height:56, borderRadius:28, backgroundColor:GOLD+'26', borderWidth:1, borderColor:GOLD+'4D', alignItems:'center', justifyContent:'center', marginBottom:16 },
  urgentTitle:    { fontSize:18, fontWeight:'600', color:TEXT, marginBottom:10 },
  urgentBody:     { fontSize:13, color:MUTED, textAlign:'center', lineHeight:20, marginBottom:8 },
  urgentCancelBtn:{ marginTop:10, paddingVertical:12, paddingHorizontal:24, borderRadius:12, borderWidth:0.5, borderColor:BORDER },
  urgentCancelText:{ fontSize:13, color:MUTED },
});
