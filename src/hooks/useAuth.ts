import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isCloudConfigured } from "../lib/supabase";
import { wipeVault } from "../lib/storage";

export type AuthStatus = "disabled" | "checking" | "signedOut" | "signedIn" | "recovery";

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(
    isCloudConfigured ? "checking" : "disabled"
  );
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "signedIn" : "signedOut");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") {
        setSession(next);
        setStatus("recovery");
        return;
      }
      setSession(next);
      setStatus(next ? "signedIn" : "signedOut");
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { needsConfirmation: false };
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      throw err;
    }
    return { needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // IndexedDB is only ever a cache of the signed-in user's remote vault
    // once cloud sync is on — clear it so a shared device can't leave a
    // previous account's encrypted cache sitting behind at the lock screen.
    await wipeVault();
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const completePasswordReset = useCallback(async (newPassword: string) => {
    if (!supabase) return;
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) {
      setError(err.message);
      throw err;
    }
    setStatus("signedIn");
  }, []);

  return {
    enabled: isCloudConfigured,
    status,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    error,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    completePasswordReset,
  };
}
