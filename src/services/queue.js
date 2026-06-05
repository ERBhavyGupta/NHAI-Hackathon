/**
 * services/queue.js
 * Offline-first queue for liveness capture uploads.
 * Survives app restarts via AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // required for uuid
import { v4 as uuidv4 } from 'uuid';

const QUEUE_KEY = '@upload_queue';

/**
 * Read the raw queue array from storage.
 * @returns {Promise<Array>}
 */
const readQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[Queue] readQueue error:', error);
    return [];
  }
};

/**
 * Persist the queue array to storage.
 * @param {Array} queue
 */
const writeQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Queue] writeQueue error:', error);
    throw error;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a liveness capture item to the queue.
 * @param {{ liveness: string, imagePath: string }} item
 * @returns {Promise<Object>} The stored queue item
 */
export const addToQueue = async (item) => {
  const queue = await readQueue();
  const entry = {
    id: item.id || uuidv4(),
    personId: item.personId || '',
    employeeId: item.employeeId || '',
    name: item.name || '',
    timestamp: item.timestamp || new Date().toISOString(),
    liveness: item.liveness || 'passed',
    imagePath: item.imagePath || '',
    syncStatus: 'pending',
  };
  queue.push(entry);
  await writeQueue(queue);
  return entry;
};

/**
 * Get all items currently in the queue.
 * @returns {Promise<Array>}
 */
export const getQueue = async () => {
  return await readQueue();
};

/**
 * Remove an item from the queue by id.
 * @param {string} id
 */
export const removeFromQueue = async (id) => {
  const queue = await readQueue();
  const updated = queue.filter((item) => item.id !== id);
  await writeQueue(updated);
};

/**
 * Update the syncStatus of a specific queue item.
 * @param {string} id
 * @param {'pending'|'success'|'failed'} status
 */
export const updateQueueItemStatus = async (id, status) => {
  const queue = await readQueue();
  const updated = queue.map((item) =>
    item.id === id ? { ...item, syncStatus: status } : item
  );
  await writeQueue(updated);
};

/**
 * Clear all items from the queue.
 */
export const clearQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (error) {
    console.error('[Queue] clearQueue error:', error);
    throw error;
  }
};
