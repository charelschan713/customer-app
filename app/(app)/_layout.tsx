import { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { BG, TABBAR, GOLD, MUTED } from '../../src/lib/format';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Gold floating center "+" button — 1:1 ASDriver style ──
function BookButton() {
  return (
    <TouchableOpacity
      style={styles.bookBtn}
      onPress={() => router.push('/(app)/book')}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const queryClient = useQueryClient();
  const notifRef   = useRef<any>();
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
        // 1:1 ASDriver tab bar — dark with pill-shaped active
        tabBarStyle: {
          backgroundColor: TABBAR,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 8,
          paddingTop: 6,
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 24,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarBackground: () => null,
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
      <Tabs.Screen
        name="book"
        options={{
          title: '',
          tabBarButton: () => <BookButton />,
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
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="payments" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bookBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
});
