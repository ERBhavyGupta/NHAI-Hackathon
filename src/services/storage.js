/**
 * services/storage.js
 * Handles persistent token and user storage using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@auth_token',
  USER: '@auth_user',
  LOCAL_USERS: '@auth_local_users',
};

// ─── Token ────────────────────────────────────────────────────────────────────

export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  } catch (error) {
    console.error('[Storage] saveToken error:', error);
    throw error;
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch (error) {
    console.error('[Storage] getToken error:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.TOKEN);
  } catch (error) {
    console.error('[Storage] removeToken error:', error);
    throw error;
  }
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('[Storage] saveUser error:', error);
    throw error;
  }
};

export const getUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('[Storage] getUser error:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.USER);
  } catch (error) {
    console.error('[Storage] removeUser error:', error);
    throw error;
  }
};

export const getLocalUsers = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LOCAL_USERS);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('[Storage] getLocalUsers error:', error);
    return {};
  }
};

export const saveLocalUser = async ({ name, employeeId, password }) => {
  try {
    const key = String(employeeId).trim().toUpperCase();
    const users = await getLocalUsers();
    users[key] = {
      name: String(name).trim(),
      employee_id: key,
      password,
      userId: users[key]?.userId || `local_${key}`,
      createdAt: users[key]?.createdAt || new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEYS.LOCAL_USERS, JSON.stringify(users));
    return users[key];
  } catch (error) {
    console.error('[Storage] saveLocalUser error:', error);
    throw error;
  }
};

export const findLocalUser = async (employeeId) => {
  const key = String(employeeId).trim().toUpperCase();
  const users = await getLocalUsers();
  return users[key] || null;
};
