import { useCallback, useEffect, useRef, useState } from "react";
import type { NewCardInput, VaultMeta, WalletCard } from "../types";
import { deriveKey, decryptJSON, encryptJSON, newSalt } from "../lib/crypto";
import {
  loadMeta,
  saveMeta,
  loadBlob,
  saveBlob,
  wipeVault,
} from "../lib/storage";
import { fetchRemoteVault, upsertRemoteVault, deleteRemoteVault } from "../lib/cloudVault";
import { isCloudConfigured } from "../lib/supabase";
import { detectNetwork } from "../lib/cardDetect";

export type VaultStatus = "checking" | "setup" | "locked" | "unlocked";

const AUTO_LOCK_MS = 3 * 60 * 1000;
const VERIFIER_MARKER = { ok: true };

function uid(): string {
  return crypto.randomUUID();
}

/**
 * `userId` is the signed-in Supabase user, or null for local-only mode.
 * The AES key is always derived client-side from a vault passphrase that is
 * never sent anywhere — Supabase (when configured) only ever stores salt,
 * a verifier, and ciphertext.
 */
export function useVault(userId: string | null) {
  const [status, setStatus] = useState<VaultStatus>("checking");
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const keyRef = useRef<CryptoKey | null>(null);
  const metaRef = useRef<VaultMeta | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    keyRef.current = null;
    metaRef.current = null;
    setCards([]);
    setStatus("locked");
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      keyRef.current = null;
      metaRef.current = null;
      setCards([]);
      setStatus("checking");

      if (userId && isCloudConfigured) {
        try {
          const remote = await fetchRemoteVault(userId);
          if (cancelled) return;
          if (remote) {
            // Mirror the remote vault into the local cache so the app keeps
            // working offline once unlocked once on this device.
            await saveMeta({ salt: remote.salt, verifier: remote.verifier });
            await saveBlob(remote.blob);
            setStatus("locked");
            return;
          }
        } catch {
          // Offline or request failed — fall back to whatever is cached
          // locally from a previous session, if any.
        }
      }
      if (cancelled) return;
      const meta = await loadMeta();
      setStatus(meta ? "locked" : "setup");
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      lock();
    }, AUTO_LOCK_MS);
  }, [lock]);

  useEffect(() => {
    if (status !== "unlocked") return;
    resetInactivityTimer();
    const events = ["pointerdown", "keydown", "touchstart"];
    const onActivity = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, onActivity));
    const onVisibility = () => {
      if (document.hidden) lock();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [status, resetInactivityTimer, lock]);

  const persist = useCallback(
    async (nextCards: WalletCard[]) => {
      if (!keyRef.current) return;
      const blob = await encryptJSON(keyRef.current, nextCards);
      await saveBlob(blob);
      if (userId && isCloudConfigured && metaRef.current) {
        setSyncing(true);
        try {
          await upsertRemoteVault(userId, { ...metaRef.current, blob });
          setError(null);
        } catch {
          setError("Échec de synchronisation cloud — vos cartes restent enregistrées sur cet appareil.");
        } finally {
          setSyncing(false);
        }
      }
    },
    [userId]
  );

  const createVault = useCallback(
    async (passphrase: string) => {
      setError(null);
      const salt = newSalt();
      const key = await deriveKey(passphrase, new Uint8Array(salt));
      const verifier = await encryptJSON(key, VERIFIER_MARKER);
      const meta: VaultMeta = { salt, verifier };
      const blob = await encryptJSON(key, []);
      await saveMeta(meta);
      await saveBlob(blob);
      keyRef.current = key;
      metaRef.current = meta;
      setCards([]);
      setStatus("unlocked");
      if (userId && isCloudConfigured) {
        setSyncing(true);
        try {
          await upsertRemoteVault(userId, { ...meta, blob });
        } catch {
          setError("Échec de synchronisation cloud — vos cartes restent enregistrées sur cet appareil.");
        } finally {
          setSyncing(false);
        }
      }
    },
    [userId]
  );

  const unlock = useCallback(async (passphrase: string) => {
    setError(null);
    const meta = await loadMeta();
    if (!meta) {
      setStatus("setup");
      return false;
    }
    try {
      const key = await deriveKey(passphrase, new Uint8Array(meta.salt));
      await decryptJSON(key, meta.verifier);
      const blob = await loadBlob();
      const decoded = blob ? await decryptJSON<WalletCard[]>(key, blob) : [];
      keyRef.current = key;
      metaRef.current = meta;
      setCards(decoded);
      setStatus("unlocked");
      return true;
    } catch {
      setError("Code incorrect.");
      return false;
    }
  }, []);

  const addCard = useCallback(
    async (input: NewCardInput) => {
      const card: WalletCard = {
        ...input,
        id: uid(),
        network: detectNetwork(input.number),
        createdAt: Date.now(),
      };
      const next = [card, ...cards];
      setCards(next);
      await persist(next);
      return card;
    },
    [cards, persist]
  );

  const updateCard = useCallback(
    async (id: string, patch: Partial<NewCardInput>) => {
      const next = cards.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              network: patch.number ? detectNetwork(patch.number) : c.network,
            }
          : c
      );
      setCards(next);
      await persist(next);
    },
    [cards, persist]
  );

  const deleteCard = useCallback(
    async (id: string) => {
      const next = cards.filter((c) => c.id !== id);
      setCards(next);
      await persist(next);
    },
    [cards, persist]
  );

  const resetVault = useCallback(async () => {
    await wipeVault();
    if (userId && isCloudConfigured) {
      try {
        await deleteRemoteVault(userId);
      } catch {
        // Local wipe already happened; surface nothing blocking here — the
        // user is intentionally starting over.
      }
    }
    keyRef.current = null;
    metaRef.current = null;
    setCards([]);
    setStatus("setup");
  }, [userId]);

  return {
    status,
    cards,
    error,
    syncing,
    createVault,
    unlock,
    lock,
    addCard,
    updateCard,
    deleteCard,
    resetVault,
  };
}
