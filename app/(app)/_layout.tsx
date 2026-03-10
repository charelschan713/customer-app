import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GOLD } from '../../src/lib/format';
import { setUnauthorizedHandler } from '../../src/lib/api';
import { useTheme } from '../../src/context/ThemeContext';

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
  const { primaryColor } = useTheme(); // tenant brand accent color

  useEffect(() => {
    // Register 401 handler — redirect to login when auth token expires
    setUnauthorizedHandler(() => {
      router.replace('/login');
    });

    notifRef.current = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    });
    responseRef.current = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as any;
      if (data?.booking_id) router.push(`/(app)/bookings/${data.booking_id}`);
    });
    return () => {
      setUnauthorizedHandler(null);
      Notifications.removeNotificationSubscription(notifRef.current);
      Notifications.removeNotificationSubscription(responseRef.current);
    };
  }, [queryClient]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Tenant primary color for active tab tint — from ThemeContext.
        // Falls back to GOLD if theme not yet loaded.
        tabBarActiveTintColor: primaryColor || GOLD,
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1A1A2E',
          borderTopColor: '#333355',
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        // Active tab gets a pill background highlight (ASDriverNative)
        tabBarItemStyle: { borderRadius: 12 },
      }}
      screenListeners={{
        tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      }}
    >
      {/* ── Visible tabs (1:1 ASDriverNative) ── */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={focused ? (primaryColor || GOLD) : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'list-circle' : 'list-circle-outline'} size={size} color={focused ? (primaryColor || GOLD) : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size} color={focused ? (primaryColor || GOLD) : '#6B7280'} />
          ),
          // Tab bar hidden on book screen — matches web /quote (no bottom nav)
          tabBarStyle: { display: 'none' }, 
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={focused ? (primaryColor || GOLD) : '#6B7280'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'} size={size} color={focused ? (primaryColor || GOLD) : '#6B7280'} />
          ),
        }}
      />

      {/* ── Hidden from tab bar ── */}
      <Tabs.Screen name="payments"  options={{ href: null }} />
    </Tabs>
  );
}
