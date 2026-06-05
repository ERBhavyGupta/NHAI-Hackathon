/**
 * screens/SplashScreen.js
 * Datalake 3.0 style splash
 */

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => { router.replace(token ? '/home' : '/login'); }, 1400);
      return () => clearTimeout(timer);
    }
  }, [loading, token]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.emblemRing}>
          <Text style={styles.emblemEmoji}>🏛️</Text>
        </View>
        <Text style={styles.appName}>Datalake 3.0</Text>
        <Text style={styles.tagline}>Field Personnel Verification System</Text>

        <View style={styles.divider} />

        <Text style={styles.module}>Facial Recognition & Liveness Detection</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.poweredText}>powered by </Text>
        <Text style={styles.digitalIndia}>🇮🇳 Digital India</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDF2', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', gap: 12 },
  emblemRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10, marginBottom: 8 },
  emblemEmoji: { fontSize: 48 },
  appName: { fontSize: 32, fontWeight: '800', color: '#1B3E7B', letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: '#666', letterSpacing: 0.3 },
  divider: { width: 60, height: 2, backgroundColor: '#1B3E7B', borderRadius: 2, marginVertical: 8 },
  module: { fontSize: 12, color: '#888', letterSpacing: 0.5, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 48, flexDirection: 'row', alignItems: 'center' },
  poweredText: { color: '#999', fontSize: 12 },
  digitalIndia: { color: '#138808', fontSize: 12, fontWeight: '700' },
});
