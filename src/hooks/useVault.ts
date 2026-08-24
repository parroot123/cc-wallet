import { useCallback, useEffect, useRef, useState } from "react";
import type { NewCardInput, WalletCard } from "../types";
import { deriveKey, decryptJSON, encryptJSON, newSalt } from "../lib/crypto";
import {
  loadMeta,
  saveMeta,
  loadBlob,
  saveBlob,
  wipeVault,
} from "../lib/storage";
import { detectNetwork } from "../lib/cardDetect";

export type VaultStatus = "checking" | "setup" | "locked" | "unlocked";

const AUTO_LOCK_MS = 3 * 60 * 1000;
const VERIFIER_MARKER = { ok: true };

function uid(): string {
  return crypto.randomUUID();
}

export function useVault() {
  const [status, setStatus] = useState<VaultStatus>("checking");
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    keyRef.current = null;
    setCards([]);
    setStatus("locked");
  }, []);

  useEffect(() => {
    loadMeta().then((meta) => {
      setStatus(meta ? "locked" : "setup");
    });
  }, []);

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

  const persist = useCallback(async (nextCards: WalletCard[]) => {
    if (!keyRef.current) return;
    const blob = await encryptJSON(keyRef.current, nextCards);
    await saveBlob(blob);
  }, []);

  const createVault = useCallback(async (pin: string) => {
    setError(null);
    const salt = newSalt();
    const key = await deriveKey(pin, new Uint8Array(salt));
    const verifier = await encryptJSON(key, VERIFIER_MARKER);
    await saveMeta({ salt, verifier });
    await saveBlob(await encryptJSON(key, []));
    keyRef.current = key;
    setCards([]);
    setStatus("unlocked");
  }, []);

  const unlock = useCallback(async (pin: string) => {
    setError(null);
    const meta = await loadMeta();
    if (!meta) {
      setStatus("setup");
      return false;
    }
    try {
      const key = await deriveKey(pin, new Uint8Array(meta.salt));
      await decryptJSON(key, meta.verifier);
      const blob = await loadBlob();
      const decoded = blob
        ? await decryptJSON<WalletCard[]>(key, blob)
        : [];
      keyRef.current = key;
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
    keyRef.current = null;
    setCards([]);
    setStatus("setup");
  }, []);

  return {
    status,
    cards,
    error,
    createVault,
    unlock,
    lock,
    addCard,
    updateCard,
    deleteCard,
    resetVault,
  };
}
