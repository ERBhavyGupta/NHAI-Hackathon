// src/modules/Database.ts
// SQLite database for storing enrolled persons and sync queue
// Works 100% offline

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

const ensureDB = async (): Promise<void> => {
  if (!db) await initDB();
};

// ── Initialize DB ─────────────────────────────────────
export const initDB = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync('datalake.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS persons (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      embedding   TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id          TEXT PRIMARY KEY,
      person_id   TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      name        TEXT NOT NULL,
      timestamp   INTEGER NOT NULL,
      liveness    TEXT NOT NULL,
      image_path  TEXT,
      status      TEXT DEFAULT 'pending'
    );
  `);

  console.log('[DB] Initialized successfully');
};

// ── Persons ───────────────────────────────────────────

export const enrollPerson = async (
  id         : string,
  name       : string,
  employeeId : string,
  embedding  : number[]
): Promise<void> => {
  await ensureDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO persons (id, name, employee_id, embedding, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, employeeId, JSON.stringify(embedding), Date.now()]
  );
  console.log(`[DB] Enrolled: ${name} (${employeeId})`);
};

export const getAllPersons = async (): Promise<{
  id        : string;
  name      : string;
  employeeId: string;
  embedding : number[];
}[]> => {
  await ensureDB();
  const rows = await db.getAllAsync<{
    id: string; name: string; employee_id: string; embedding: string;
  }>('SELECT * FROM persons');

  return rows.map(r => ({
    id        : r.id,
    name      : r.name,
    employeeId: r.employee_id,
    embedding : JSON.parse(r.embedding),
  }));
};

export const getPersonCount = async (): Promise<number> => {
  await ensureDB();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM persons'
  );
  return result?.count ?? 0;
};

export const deletePerson = async (id: string): Promise<void> => {
  await ensureDB();
  await db.runAsync('DELETE FROM persons WHERE id = ?', [id]);
};

// ── Sync Queue ────────────────────────────────────────

export const addToSyncQueue = async (item: {
  id         : string;
  personId   : string;
  employeeId : string;
  name       : string;
  liveness   : string;
  imagePath ?: string;
}): Promise<void> => {
  await ensureDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_queue
     (id, person_id, employee_id, name, timestamp, liveness, image_path, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      item.id, item.personId, item.employeeId,
      item.name, Date.now(), item.liveness,
      item.imagePath ?? ''
    ]
  );
};

export const getPendingQueue = async (): Promise<any[]> => {
  await ensureDB();
  return await db.getAllAsync(
    `SELECT * FROM sync_queue WHERE status = 'pending'`
  );
};

export const updateQueueStatus = async (
  id    : string,
  status: 'pending' | 'success' | 'failed'
): Promise<void> => {
  await ensureDB();
  await db.runAsync(
    'UPDATE sync_queue SET status = ? WHERE id = ?',
    [status, id]
  );
};

export const clearSyncedItems = async (): Promise<void> => {
  await ensureDB();
  await db.runAsync(`DELETE FROM sync_queue WHERE status = 'success'`);
};
