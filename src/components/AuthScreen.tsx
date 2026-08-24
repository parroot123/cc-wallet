import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { useAuth } from "../hooks/useAuth";
import "./LockScreen.css";
import "./AuthScreen.css";

interface AuthScreenProps {
  auth: ReturnType<typeof useAuth>;
}

type Tab = "signIn" | "signUp" | "forgot";

export function AuthScreen({ auth }: AuthScreenProps) {
  const [tab, setTab] = useState<Tab>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const triggerShake = () => setShake((s) => s + 1);

  if (auth.status === "recovery") {
    const handleRecovery = async (e: FormEvent) => {
      e.preventDefault();
      setLocalError(null);
      if (newPassword.length < 8) {
        setLocalError("8 caractères minimum.");
        triggerShake();
        return;
      }
      setSubmitting(true);
      try {
        await auth.completePasswordReset(newPassword);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Échec de la mise à jour.");
        triggerShake();
      }
      setSubmitting(false);
    };

    return (
      <div className="lock-screen">
        <div className="lock-screen__bg" aria-hidden />
        <motion.div
          className="lock-screen__panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, x: shake ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }}
          transition={{ duration: shake ? 0.45 : 0.4, ease: "easeOut" }}
          key={shake}
        >
          <div className="lock-screen__icon">
            <KeyIcon />
          </div>
          <h1>Nouveau mot de passe</h1>
          <p className="lock-screen__subtitle">
            Choisissez un nouveau mot de passe pour votre compte.
          </p>
          <form onSubmit={handleRecovery} className="lock-screen__form">
            <input
              type="password"
              autoFocus
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="lock-screen__input"
              autoComplete="new-password"
            />
            {localError && <p className="lock-screen__error">{localError}</p>}
            <button type="submit" className="lock-screen__submit" disabled={submitting || !newPassword}>
              Mettre à jour
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setNotice(null);

    if (tab === "forgot") {
      setSubmitting(true);
      try {
        await auth.requestPasswordReset(email);
        setNotice("Si un compte existe pour cet e-mail, un lien de réinitialisation vient d'être envoyé.");
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Échec de l'envoi.");
        triggerShake();
      }
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setLocalError("8 caractères minimum.");
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      if (tab === "signUp") {
        const { needsConfirmation } = await auth.signUp(email, password);
        if (needsConfirmation) {
          setNotice("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.");
          setTab("signIn");
        }
      } else {
        await auth.signIn(email, password);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Une erreur est survenue.");
      triggerShake();
    }
    setSubmitting(false);
  };

  return (
    <div className="lock-screen">
      <div className="lock-screen__bg" aria-hidden />
      <motion.div
        className="lock-screen__panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, x: shake ? [0, -10, 10, -8, 8, -4, 4, 0] : 0 }}
        transition={{ duration: shake ? 0.45 : 0.4, ease: "easeOut" }}
        key={shake}
      >
        <div className="lock-screen__icon">
          <WalletIcon />
        </div>
        <h1>
          {tab === "signUp" ? "Créer un compte" : tab === "forgot" ? "Mot de passe oublié" : "Bon retour"}
        </h1>
        <p className="lock-screen__subtitle">
          {tab === "forgot"
            ? "Recevez un lien pour réinitialiser le mot de passe de votre compte."
            : "Votre compte protège l'accès à l'app. Vos cartes restent chiffrées par une phrase secrète séparée, que seul vous connaissez."}
        </p>

        {tab !== "forgot" && (
          <div className="auth-screen__tabs">
            <button
              type="button"
              className={`auth-screen__tab ${tab === "signIn" ? "auth-screen__tab--active" : ""}`}
              onClick={() => {
                setTab("signIn");
                setLocalError(null);
                setNotice(null);
              }}
            >
              Connexion
            </button>
            <button
              type="button"
              className={`auth-screen__tab ${tab === "signUp" ? "auth-screen__tab--active" : ""}`}
              onClick={() => {
                setTab("signUp");
                setLocalError(null);
                setNotice(null);
              }}
            >
              Inscription
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="lock-screen__form">
          <input
            type="email"
            autoFocus
            placeholder="Adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="lock-screen__input"
            autoComplete="email"
          />
          {tab !== "forgot" && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lock-screen__input"
              autoComplete={tab === "signUp" ? "new-password" : "current-password"}
            />
          )}

          {localError && <p className="lock-screen__error">{localError}</p>}
          {notice && <p className="auth-screen__notice">{notice}</p>}

          <button type="submit" className="lock-screen__submit" disabled={submitting || !email || (tab !== "forgot" && !password)}>
            {tab === "signUp" ? "Créer le compte" : tab === "forgot" ? "Envoyer le lien" : "Se connecter"}
          </button>
        </form>

        <div className="auth-screen__links">
          {tab === "forgot" ? (
            <button type="button" className="auth-screen__link" onClick={() => setTab("signIn")}>
              Retour à la connexion
            </button>
          ) : (
            <button type="button" className="auth-screen__link" onClick={() => setTab("forgot")}>
              Mot de passe oublié ?
            </button>
          )}
        </div>

        <p className="lock-screen__hint">
          Vos numéros de carte ne transitent jamais en clair : ils sont chiffrés sur votre appareil avant
          d'être synchronisés.
        </p>
      </motion.div>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 12l9-9M15 4l3 3M18 7l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
