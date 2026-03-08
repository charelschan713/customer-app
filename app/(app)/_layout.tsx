import { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { GOLD, DARK, BORDER } from '../../src/lib/format';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Gold floating center "+" button — 1:1 web portal style
function CenterAddButton() {
  return (
    <TouchableOpacity
      style={styles.centerBtn}
      onPress={() => router.push('/(app)/book')}
      activeOpacity={0.85}
    >
      <Text style={styles.centerBtnIcon}>+</Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const queryClient = useQueryClient();
  const notifRef = useRef<any>();
  const responseRef = useRef<any>();

  useEffect(() => {
    notifRef.current = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    });
    responseRef.current = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as any;
      if (data?.booking_id) router.push(`/(app)/bookings/${data.booking_id}`);
    });
    return () => {
      Notifications.removeNotificationSubscription(notifRef.current);
      Notifications.removeNotificationSubscription(responseRef.current);
    };
  }, [queryClient]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: BORDER,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: DARK,
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      {/* Center floating "+" tab */}
      <Tabs.Screen
        name="book"
        options={{
          title: '',
          tabBarButton: () => <CenterAddButton />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      {/* Hidden tabs (accessible via nav but not in tab bar) */}
      <Tabs.Screen name="payments" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  centerBtnIcon: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
