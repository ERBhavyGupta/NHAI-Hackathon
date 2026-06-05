/**
 * app/_layout.tsx
 * Root layout: wraps all routes in AuthProvider.
 */

import { AuthProvider } from '../context/AuthContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0A0A14' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0A0A14' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="enroll" options={{ title: 'Enroll Personnel' }} />
        <Stack.Screen name="sync" options={{ title: 'Sync' }} />
      </Stack>
    </AuthProvider>
  );
}
