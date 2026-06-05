/**
 * screens/SyncScreen.js
 * Datalake 3.0 style
 */

import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { uploadCapture } from '../services/api';

import { getQueue, updateQueueItemStatus, clearQueue, removeFromQueue } from '../services/queue';

export default function SyncScreen() {
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadQueue(); }, []));

  const loadQueue = async () => {
    const q = await getQueue();
    setQueue(q);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueue();
    setRefreshing(false);
  };

  const pending = queue.filter((i) => i.syncStatus === 'pending').length;
  const success = queue.filter((i) => i.syncStatus === 'success').length;
  const failed = queue.filter((i) => i.syncStatus === 'failed').length;

  const handleSync = async () => {
    const allItems = await getQueue();
    const pendingItems = allItems.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed');
    if (pendingItems.length === 0) { Alert.alert('All Clear', 'No pending items to sync.'); return; }
    setSyncing(true);
    let successCount = 0, failCount = 0;
    for (const item of pendingItems) {
      try {
        await uploadCapture(item);
        await removeFromQueue(item.id);  // purge immediately after upload
        successCount++;
      } catch (e) {
        console.error('[Sync] Failed item:', JSON.stringify(item));
        console.error('[Sync] Error:', e.message);
        await updateQueueItemStatus(item.id, 'failed');
        failCount++;
      }
    }
    await loadQueue();
    setSyncing(false);
    Alert.alert('Sync Complete', `✅ ${successCount} uploaded\n❌ ${failCount} failed`);
  };

  const StatusBadge = ({ status }) => {
    const config = { pending: { color: '#E67E00', label: 'Pending' }, success: { color: '#1A7A3A', label: 'Uploaded' }, failed: { color: '#CC0000', label: 'Failed' } }[status] || { color: '#666', label: status };
    return (
      <View style={[styles.badge, { backgroundColor: config.color + '15', borderColor: config.color + '40', borderWidth: 1 }]}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B3E7B" />}>
      {/* Gov Header */}
      <View style={styles.govHeader}>
        <Text style={styles.emblemEmoji}>🏛️</Text>
        <View>
          <Text style={styles.govTitle}>Datalake 3.0</Text>
          <Text style={styles.govSubtitle}>Sync & Upload Manager</Text>
        </View>
      </View>

      {/* Stats Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Status</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#E67E00' }]}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#1A7A3A' }]}>{success}</Text>
            <Text style={styles.statLabel}>Uploaded</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#CC0000' }]}>{failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>

      {/* Sync Button */}
      <Pressable style={({ pressed }) => [styles.button, syncing && styles.buttonDisabled, pressed && styles.buttonPressed]} onPress={handleSync} disabled={syncing}>
        {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>🔄  Sync Now</Text>}
      </Pressable>

      {/* Queue List */}
      <Text style={styles.sectionTitle}>QUEUE ({queue.length} ITEMS)</Text>

      {queue.length === 0 ? (
        <View style={styles.card}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Queue is empty</Text>
            <Text style={styles.emptySubText}>Complete a liveness check to add items</Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          {queue.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <View style={styles.itemDivider} />}
              <View style={styles.queueItem}>
                <View>
                  <Text style={styles.queueId}>#{item.id.slice(0, 16)}</Text>
                  <Text style={styles.queueTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                </View>
                <StatusBadge status={item.syncStatus} />
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.version}>APP VERSION: V1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDF2' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  govHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  emblemEmoji: { fontSize: 32 },
  govTitle: { fontSize: 16, fontWeight: '800', color: '#1B3E7B' },
  govSubtitle: { fontSize: 10, color: '#666' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#F0F0F0' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#666' },
  button: { backgroundColor: '#1B3E7B', borderRadius: 30, paddingVertical: 16, alignItems: 'center', elevation: 2 },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: '#999', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
  emptySubText: { color: '#888', fontSize: 12, textAlign: 'center' },
  itemDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  queueItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queueId: { color: '#1A1A1A', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  queueTime: { color: '#888', fontSize: 11, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  version: { color: '#999', fontSize: 11, letterSpacing: 1, textAlign: 'center' },
});
