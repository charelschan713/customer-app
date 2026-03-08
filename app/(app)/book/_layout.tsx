import { Stack } from 'expo-router';
import { BG } from '../../../src/lib/format';

export default function BookLayout() {
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
