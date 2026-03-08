import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GOLD } from '../../src/lib/format';

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

  const onTabPress = () => {
    // 1:1 ASDriverNative: UIImpactFeedbackGenerator(.light).impactOccurred()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 1:1 ASDriverNative: .tint(.brandGold) — standard iOS tab bar
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1A1A2E',
          borderTopColor: '#333355',
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
      screenListeners={{
        tabPress: onTabPress,
      }}
    >
      {/* Home — house / house.fill */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={focused ? GOLD : '#6B7280'}
            />
          ),
        }}
      />

      {/* Jobs — list.bullet.clipboard / .fill → list-circle */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'list-circle' : 'list-circle-outline'}
              size={size}
              color={focused ? GOLD : '#6B7280'}
            />
          ),
        }}
      />

      {/* Book (= Calendar equivalent for customer) — calendar.circle / .fill */}
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={size}
              color={focused ? GOLD : '#6B7280'}
            />
          ),
        }}
      />

      {/* Invoices — receipt */}
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={focused ? GOLD : '#6B7280'}
            />
          ),
        }}
      />

      {/* More — ellipsis.circle / .fill */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'}
              size={size}
              color={focused ? GOLD : '#6B7280'}
            />
          ),
        }}
      />

      {/* Hidden */}
      <Tabs.Screen name="payments" options={{ href: null }} />
    </Tabs>
  );
}
