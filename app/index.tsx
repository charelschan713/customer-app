import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { isLoggedIn } from '../src/lib/auth';
import { BG, GOLD } from '../src/lib/format';

export default function Index() {
  useEffect(() => {
    isLoggedIn().then((ok) => {
      router.replace(ok ? '/(app)/home' : '/login');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={GOLD} size="large" />
    </View>
  );
}
