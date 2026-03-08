import { Stack } from 'expo-router';
import { BG, TEXT } from '../../../src/lib/format';

export default function BookingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BG },
        animation: 'slide_from_right',
      }}
    />
  );
}
