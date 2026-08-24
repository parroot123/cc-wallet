import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import "./LockScreen.css";

interface LockScreenProps {
  mode: "setup" | "locked";
  error: string | null;
  onSubmit: (pin: string) => Promise<boolean | void>;
}

export function LockScreen({ mode, error, onSubmit }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const triggerShake = () => setShake((s) => s + 1);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (mode === "setup") {
      if (pin.length < 6) {
        setLocalError("6 caractères minimum.");
        triggerShake();
        return;
      }
      if (pin !== confirm) {
        setLocalError("Les codes ne correspondent pas.");
        triggerShake();
        return;
      }
    }

    setSubmitting(true);
    const result = await onSubmit(pin);
    setSubmitting(false);
    if (mode === "locked" && result === false) {
      triggerShake();
      setPin("");
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-screen__bg" aria-hidden />
      <motion.div
        className="lock-screen__panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: 1,
          y: 0,
          x: shake ? [0, -10, 10, -8, 8, -4, 4, 0] : 0,
        }}
        transition={{ duration: shake ? 0.45 : 0.4, ease: "easeOut" }}
        key={shake}
      >
        <div className="lock-screen__icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <rect
              x="4"
              y="10"
              width="16"
              height="10"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 10V7a4 4 0 0 1 8 0v3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1>{mode === "setup" ? "Créer votre coffre" : "Portefeuille verrouillé"}</h1>
        <p className="lock-screen__subtitle">
          {mode === "setup"
            ? "Choisissez un code d'accès. Il chiffre vos cartes localement — il n'est jamais envoyé où que ce soit."
            : "Entrez votre code pour accéder à vos cartes."}
        </p>

        <form onSubmit={handleSubmit} className="lock-screen__form">
          <input
            type="password"
            inputMode="text"
            autoFocus
            placeholder="Code d'accès"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="lock-screen__input"
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
          />
          {mode === "setup" && (
            <input
              type="password"
              placeholder="Confirmer le code"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="lock-screen__input"
              autoComplete="new-password"
            />
          )}

          {(localError || error) && (
            <p className="lock-screen__error">{localError || error}</p>
          )}

          <button
            type="submit"
            className="lock-screen__submit"
            disabled={submitting || !pin}
          >
            {mode === "setup" ? "Créer et continuer" : "Déverrouiller"}
          </button>
        </form>

        <p className="lock-screen__hint">
          Tout est stocké chiffré (AES-256) uniquement sur cet appareil.
          {mode === "setup" && " Aucun moyen de récupérer vos cartes si vous oubliez ce code — notez-le en lieu sûr."}
        </p>
      </motion.div>
    </div>
  );
}
