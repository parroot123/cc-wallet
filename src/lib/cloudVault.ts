import { supabase } from "./supabase";
import type { VaultMeta } from "../types";
import type { EncryptedBlob } from "./storage";

export interface RemoteVault extends VaultMeta {
  blob: EncryptedBlob;
}

interface VaultRow {
  salt: number[];
  verifier: { iv: number[]; data: number[] };
  blob: EncryptedBlob;
}

/** Reads the caller's own vault row. Never throws on "not found". */
export async function fetchRemoteVault(userId: string): Promise<RemoteVault | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("vaults")
    .select("salt, verifier, blob")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as VaultRow;
  return { salt: row.salt, verifier: row.verifier, blob: row.blob };
}

export async function upsertRemoteVault(
  userId: string,
  vault: RemoteVault
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("vaults")
    .upsert({ user_id: userId, salt: vault.salt, verifier: vault.verifier, blob: vault.blob });
  if (error) throw error;
}

export async function deleteRemoteVault(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("vaults").delete().eq("user_id", userId);
  if (error) throw error;
}
