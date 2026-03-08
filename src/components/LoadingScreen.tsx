import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const GOLD = process.env.EXPO_PUBLIC_PRIMARY_COLOR || '#c8a96b';
const BG = '#0d0f14';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={GOLD} />
    </View>
  );
}

export function LoadingOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={GOLD} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,15,20,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
