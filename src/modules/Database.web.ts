// Web fallback for Database.ts.
// Avoids importing expo-sqlite on web, where the package requires a missing WASM asset.

const PERSONS_KEY = '@datalake_web_persons';
const QUEUE_KEY = '@datalake_web_sync_queue';

type PersonRecord = {
  id: string;
  name: string;
  employeeId: string;
  embedding: number[];
  createdAt: number;
};

type QueueRecord = {
  id: string;
  person_id: string;
  employee_id: string;
  name: string;
  timestamp: number;
  liveness: string;
  image_path: string;
  status: 'pending' | 'success' | 'failed';
};

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown): void => {
  globalThis.localStorage?.setItem(key, JSON.stringify(value));
};

export const initDB = async (): Promise<void> => {};

export const enrollPerson = async (
  id: string,
  name: string,
  employeeId: string,
  embedding: number[]
): Promise<void> => {
  const persons = readJSON<PersonRecord[]>(PERSONS_KEY, []);
  const next = persons.filter((person) => person.id !== id);
  next.push({ id, name, employeeId, embedding, createdAt: Date.now() });
  writeJSON(PERSONS_KEY, next);
};

export const getAllPersons = async (): Promise<
  {
    id: string;
    name: string;
    employeeId: string;
    embedding: number[];
  }[]
> => {
  return readJSON<PersonRecord[]>(PERSONS_KEY, []);
};

export const getPersonCount = async (): Promise<number> => {
  return readJSON<PersonRecord[]>(PERSONS_KEY, []).length;
};

export const deletePerson = async (id: string): Promise<void> => {
  const persons = readJSON<PersonRecord[]>(PERSONS_KEY, []);
  writeJSON(
    PERSONS_KEY,
    persons.filter((person) => person.id !== id)
  );
};

export const addToSyncQueue = async (item: {
  id: string;
  personId: string;
  employeeId: string;
  name: string;
  liveness: string;
  imagePath?: string;
}): Promise<void> => {
  const queue = readJSON<QueueRecord[]>(QUEUE_KEY, []);
  queue.push({
    id: item.id,
    person_id: item.personId,
    employee_id: item.employeeId,
    name: item.name,
    timestamp: Date.now(),
    liveness: item.liveness,
    image_path: item.imagePath ?? '',
    status: 'pending',
  });
  writeJSON(QUEUE_KEY, queue);
};

export const getPendingQueue = async (): Promise<QueueRecord[]> => {
  return readJSON<QueueRecord[]>(QUEUE_KEY, []).filter((item) => item.status === 'pending');
};

export const updateQueueStatus = async (
  id: string,
  status: 'pending' | 'success' | 'failed'
): Promise<void> => {
  const queue = readJSON<QueueRecord[]>(QUEUE_KEY, []);
  writeJSON(
    QUEUE_KEY,
    queue.map((item) => (item.id === id ? { ...item, status } : item))
  );
};

export const clearSyncedItems = async (): Promise<void> => {
  const queue = readJSON<QueueRecord[]>(QUEUE_KEY, []);
  writeJSON(
    QUEUE_KEY,
    queue.filter((item) => item.status !== 'success')
  );
};
