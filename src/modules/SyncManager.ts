// src/modules/SyncManager.ts
// Handles offline-to-online sync with AWS API
// Runs automatically when network is available

import axios from 'axios';
import {
  getPendingQueue,
  updateQueueStatus,
  clearSyncedItems,
} from './Database';

const AWS_BASE = 'https://0vy4wgl8gk.execute-api.ap-south-1.amazonaws.com';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// ── Upload single capture ─────────────────────────────
const uploadCapture = async (item: any, token: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${AWS_BASE}/sync/captures/upload`,
      {
        employee_id: item.employee_id,
        name       : item.name,
        liveness   : item.liveness,
        timestamp  : item.timestamp,
        image_path : item.image_path || '',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }
    );
    return response.data?.success === true;
  } catch (e) {
    console.log('[Sync] Upload failed:', e);
    return false;
  }
};

// ── Bulk sync all pending ─────────────────────────────
export const syncNow = async (token: string): Promise<{
  success: number;
  failed : number;
}> => {
  if (isSyncing) return { success: 0, failed: 0 };
  isSyncing = true;

  let success = 0;
  let failed  = 0;

  try {
    const pending = await getPendingQueue();
    console.log(`[Sync] ${pending.length} items to sync`);

    for (const item of pending) {
      const ok = await uploadCapture(item, token);
      if (ok) {
        await updateQueueStatus(item.id, 'success');
        success++;
      } else {
        await updateQueueStatus(item.id, 'failed');
        failed++;
      }
    }

    // Purge successfully synced items
    if (success > 0) await clearSyncedItems();

    console.log(`[Sync] Done — ✅ ${success} uploaded, ❌ ${failed} failed`);
  } catch (e) {
    console.error('[Sync] Sync error:', e);
  } finally {
    isSyncing = false;
  }

  return { success, failed };
};

// ── Auto sync every 30 seconds ────────────────────────
export const startSyncManager = (token: string): void => {
  if (syncInterval) return;

  console.log('[Sync] Auto-sync started');

  syncInterval = setInterval(async () => {
    try {
      const pending = await getPendingQueue();
      if (pending.length > 0) {
        console.log('[Sync] Auto-syncing', pending.length, 'items...');
        await syncNow(token);
      }
    } catch (e) {
      console.log('[Sync] Auto-sync error:', e);
    }
  }, 30000);
};

export const stopSyncManager = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[Sync] Auto-sync stopped');
  }
};
