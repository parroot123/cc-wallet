// All cryptography happens client-side via the Web Crypto API.
// Nothing here ever touches the network — the derived key and plaintext
// card data live only in memory for the duration of the session.

const PBKDF2_ITERATIONS = 250_000;

function toBytes(arr: number[]): Uint8Array {
  return new Uint8Array(arr);
}

function toArray(buf: ArrayBuffer | Uint8Array): number[] {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function importPassphraseKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await importPassphraseKey(passphrase);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJSON(
  key: CryptoKey,
  value: unknown
): Promise<{ iv: number[]; data: number[] }> {
  const iv = randomBytes(12);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );
  return { iv: toArray(iv), data: toArray(ciphertext) };
}

export async function decryptJSON<T>(
  key: CryptoKey,
  payload: { iv: number[]; data: number[] }
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBytes(payload.iv) as BufferSource },
    key,
    toBytes(payload.data) as BufferSource
  );
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export function newSalt(): number[] {
  return toArray(randomBytes(16));
}
