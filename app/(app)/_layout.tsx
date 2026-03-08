import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BG, GOLD, SUB } from '../../src/lib/format';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function AppLayout() {
  const queryClient = useQueryClient();
  const notifRef    = useRef<any>();
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
        // 1:1 ASDriverNative: .tint(.brandGold), dark tab bar
        tabBarStyle: {
          backgroundColor: '#1A1A2E',
          borderTopColor: '#333355',
          borderTopWidth: 0.5,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: GOLD,       // .tint(.brandGold)
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'house.fill' as any : 'home-outline'} size={size} color={focused ? GOLD : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'list-circle' : 'list-circle-outline'} size={size} color={focused ? GOLD : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size} color={focused ? GOLD : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={focused ? GOLD : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} size={size} color={focused ? GOLD : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen name="payments" options={{ href: null }} />
    </Tabs>
  );
}
