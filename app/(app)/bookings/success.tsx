import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { BG, GOLD, TEXT, MUTED } from '../../../src/lib/format';

export default function SuccessScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={styles.icon}>✦</Text>
      <Text style={styles.title}>Booking Confirmed!</Text>
      <Text style={styles.sub}>Your chauffeur has been booked.</Text>
      {ref && (
        <View style={styles.refBox}>
          <Text style={styles.refLabel}>REFERENCE</Text>
          <Text style={styles.ref}>{ref}</Text>
        </View>
      )}
      <Text style={styles.note}>A confirmation email has been sent to your inbox.</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(app)/bookings')}>
        <Text style={styles.btnText}>View My Trips</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/(app)/home')}>
        <Text style={styles.link}>Back to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 56, color: GOLD, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: TEXT, textAlign: 'center' },
  sub: { fontSize: 15, color: MUTED, marginTop: 8, textAlign: 'center' },
  refBox: { marginTop: 28, backgroundColor: 'rgba(200,169,107,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(200,169,107,0.3)', paddingHorizontal: 32, paddingVertical: 16, alignItems: 'center' },
  refLabel: { fontSize: 10, color: GOLD, fontWeight: '700', letterSpacing: 2 },
  ref: { fontSize: 22, fontWeight: '700', color: GOLD, fontFamily: 'monospace', marginTop: 4 },
  note: { fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
  btn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, marginTop: 32 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { color: MUTED, fontSize: 14, marginTop: 16 },
});
