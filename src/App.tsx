import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useVault } from "./hooks/useVault";
import { AuthScreen } from "./components/AuthScreen";
import { LockScreen } from "./components/LockScreen";
import { WalletDeck } from "./components/WalletDeck";
import { AddCardSheet } from "./components/AddCardSheet";
import { CardDetailSheet } from "./components/CardDetailSheet";
import type { WalletCard } from "./types";
import "./App.css";

export default function App() {
  const auth = useAuth();

  if (auth.status === "recovery") return <AuthScreen auth={auth} />;
  if (auth.enabled && auth.status === "checking") return <div className="app-loading" />;
  if (auth.enabled && auth.status === "signedOut") return <AuthScreen auth={auth} />;

  return <VaultGate userId={auth.enabled ? auth.userId : null} onSignOut={auth.enabled ? auth.signOut : null} />;
}

interface VaultGateProps {
  userId: string | null;
  onSignOut: (() => Promise<void>) | null;
}

function VaultGate({ userId, onSignOut }: VaultGateProps) {
  const vault = useVault(userId);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<WalletCard | null>(null);

  if (vault.status === "checking") {
    return <div className="app-loading" />;
  }

  if (vault.status === "setup" || vault.status === "locked") {
    return (
      <LockScreen
        mode={vault.status}
        error={vault.error}
        onSubmit={(pin) =>
          vault.status === "setup" ? vault.createVault(pin) : vault.unlock(pin)
        }
      />
    );
  }

  return (
    <div className="app">
      <div className="app__bg" aria-hidden />
      <div className="app__shell">
        <header className="app__header">
          <div className="app__title">
            <span className="app__title-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <h1>Portefeuille</h1>
            {vault.syncing && <span className="app__sync-dot" title="Synchronisation…" />}
          </div>
          <div className="app__header-actions">
            {onSignOut && (
              <button className="icon-btn" onClick={() => onSignOut()} title="Se déconnecter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button className="icon-btn" onClick={() => vault.lock()} title="Verrouiller">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button className="icon-btn icon-btn--accent" onClick={() => setAddOpen(true)} title="Nouvelle carte">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {vault.error && <p className="app__error-banner">{vault.error}</p>}

        <WalletDeck
          cards={vault.cards}
          onSelect={(card) => setSelected(card)}
          onAddClick={() => setAddOpen(true)}
        />
      </div>

      <AddCardSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (input) => {
          await vault.addCard(input);
        }}
      />

      <CardDetailSheet
        card={selected}
        onClose={() => setSelected(null)}
        onDelete={async (id) => {
          await vault.deleteCard(id);
          setSelected(null);
        }}
      />
    </div>
  );
}
