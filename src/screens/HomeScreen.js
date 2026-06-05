/**
 * screens/HomeScreen.js
 * Datalake 3.0 style — integrated with F1's CameraViewComponent
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { addToQueue, getQueue } from '../services/queue';
import CameraViewComponent from '../components/CameraViewComponent';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [lastVerified, setLastVerified] = useState(null);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    const queue = await getQueue();
    setPendingCount(queue.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed').length);
  };

  const handleLivenessPass = async ({ timestamp }) => {
    setShowCamera(false);

    try {
      // Save to sync queue
      await addToQueue({
        id        : `capture_${timestamp}`,
        personId  : user?.userId || user?.employee_id || 'unknown',
        employeeId: user?.employee_id || user?.email || 'unknown',
        name      : user?.name || 'Unknown',
        liveness  : 'passed',
        imagePath : '',
      });

      setLastVerified(new Date(timestamp).toLocaleTimeString());
      await loadPending();

      Alert.alert(
        '✅ Verified!',
        'Liveness check passed. Result saved and queued for sync.',
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('[Home] Failed to save capture:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/login'); }
      },
    ]);
  };

  const firstName = user?.name?.split(' ')[0] || 'Personnel';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Gov Header */}
        <View style={styles.govHeader}>
          <Text style={styles.emblemEmoji}>🏛️</Text>
          <View>
            <Text style={styles.govTitle}>Datalake 3.0</Text>
            <Text style={styles.govSubtitle}>Field Personnel Verification System</Text>
          </View>
        </View>

        {/* Welcome Card */}
        <View style={styles.card}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.welcomeGreeting}>Welcome,</Text>
              <Text style={styles.welcomeName}>{firstName}</Text>
              {user?.employee_id && (
                <Text style={styles.employeeId}>ID: {user.employee_id}</Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending Uploads</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {lastVerified ? '✅' : '🛡️'}
              </Text>
              <Text style={styles.statLabel}>
                {lastVerified ? `Verified ${lastVerified}` : 'Identity Protected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

        {/* Verify Identity — opens camera */}
        <Pressable
          style={({ pressed }) => [styles.actionCard, styles.primaryAction, pressed && styles.pressed]}
          onPress={() => setShowCamera(true)}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#1B3E7B' }]}>
            <Text style={styles.actionEmoji}>📷</Text>
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: '#fff' }]}>Verify Identity</Text>
            <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.7)' }]}>
              Run facial liveness detection
            </Text>
          </View>
          <Text style={[styles.chevron, { color: '#fff' }]}>›</Text>
        </Pressable>

        {/* Sync Data */}
        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          onPress={() => router.push('/enroll')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionEmoji}>👤</Text>
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Enroll Personnel</Text>
            <Text style={styles.actionSub}>Capture face data for offline matching</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          onPress={() => router.push('/sync')}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionEmoji}>🔄</Text>
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Sync Data</Text>
            <Text style={styles.actionSub}>Upload pending captures to server</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.version}>APP VERSION: V1.0.0</Text>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.modalContainer}>
          <CameraViewComponent onLivenessPass={handleLivenessPass} />
          <Pressable
            style={styles.closeBtn}
            onPress={() => setShowCamera(false)}
          >
            <Text style={styles.closeBtnText}>✕ Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container   : { flex: 1, backgroundColor: '#E8EDF2' },
  content     : { padding: 20, gap: 16, paddingBottom: 48 },
  govHeader   : { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  emblemEmoji : { fontSize: 32 },
  govTitle    : { fontSize: 16, fontWeight: '800', color: '#1B3E7B' },
  govSubtitle : { fontSize: 10, color: '#666' },

  card        : { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6 },
  welcomeRow  : { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar      : { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1B3E7B', justifyContent: 'center', alignItems: 'center' },
  avatarText  : { color: '#fff', fontSize: 20, fontWeight: '800' },
  welcomeGreeting: { color: '#666', fontSize: 12 },
  welcomeName : { color: '#1A1A1A', fontSize: 20, fontWeight: '800' },
  employeeId  : { color: '#1B3E7B', fontSize: 11, fontWeight: '600', marginTop: 2 },
  divider     : { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  statsRow    : { flexDirection: 'row', alignItems: 'center' },
  stat        : { flex: 1, alignItems: 'center', gap: 4 },
  statDivider : { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  statValue   : { fontSize: 24, fontWeight: '800', color: '#1B3E7B' },
  statLabel   : { fontSize: 11, color: '#666', textAlign: 'center' },

  sectionTitle: { color: '#999', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  actionCard  : { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  primaryAction: { backgroundColor: '#1B3E7B' },
  actionIcon  : { width: 44, height: 44, borderRadius: 10, backgroundColor: '#EEF2F9', justifyContent: 'center', alignItems: 'center' },
  actionEmoji : { fontSize: 22 },
  actionText  : { flex: 1 },
  actionTitle : { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  actionSub   : { color: '#888', fontSize: 12, marginTop: 2 },
  chevron     : { color: '#1B3E7B', fontSize: 22, fontWeight: '300' },
  pressed     : { opacity: 0.8 },

  logoutBtn   : { borderRadius: 30, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#CC0000', marginTop: 8 },
  logoutText  : { color: '#CC0000', fontSize: 15, fontWeight: '700' },
  version     : { color: '#999', fontSize: 11, letterSpacing: 1, textAlign: 'center', marginTop: 8 },

  modalContainer: { flex: 1, backgroundColor: '#000' },
  closeBtn    : { position: 'absolute', top: 48, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
