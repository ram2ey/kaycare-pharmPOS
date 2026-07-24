// IndexedDB helpers for KayCare PharmPOS offline mode
// Provides: drug catalog caching + pending sale queue

const DB_NAME    = 'pharmpos_offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'offlineId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Pending Sale Queue ──────────────────────────────────────────────────────

export interface PendingSale {
  offlineId: string;
  queuedAt: string;
  payload: object;
}

export async function queueSale(payload: object): Promise<string> {
  const db = await openDB();
  const offlineId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entry: PendingSale = { offlineId, queuedAt: new Date().toISOString(), payload };
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pendingSales', 'readwrite');
    const req = tx.objectStore('pendingSales').add(entry);
    req.onsuccess = () => resolve(offlineId);
    req.onerror   = () => reject(req.error);
  });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pendingSales', 'readonly');
    const req = tx.objectStore('pendingSales').getAll();
    req.onsuccess = () => resolve(req.result as PendingSale[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function clearPendingSale(offlineId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pendingSales', 'readwrite');
    const req = tx.objectStore('pendingSales').delete(offlineId);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
