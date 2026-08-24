import type { VaultMeta } from "../types";

// Minimal IndexedDB wrapper. Everything stored here is either random salt/IV
// bytes or AES-GCM ciphertext — never plaintext card data.

const DB_NAME = "cc-wallet";
const DB_VERSION = 1;
const STORE = "vault";
const META_KEY = "meta";
const BLOB_KEY = "blob";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function get<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function set(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadMeta(): Promise<VaultMeta | undefined> {
  return get<VaultMeta>(META_KEY);
}

export async function saveMeta(meta: VaultMeta): Promise<void> {
  return set(META_KEY, meta);
}

export interface EncryptedBlob {
  iv: number[];
  data: number[];
}

export async function loadBlob(): Promise<EncryptedBlob | undefined> {
  return get<EncryptedBlob>(BLOB_KEY);
}

export async function saveBlob(blob: EncryptedBlob): Promise<void> {
  return set(BLOB_KEY, blob);
}

export async function wipeVault(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
