import { useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NewCardInput } from "../types";
import {
  detectNetwork,
  expectedLengths,
  formatExpiryInput,
  formatPAN,
  isExpired,
  luhnValid,
  NETWORK_LABELS,
  onlyDigits,
  CVV_LENGTH,
  KNOWN_BANKS,
} from "../lib/cardDetect";
import { CARD_COLOR_PRESETS } from "../lib/color";
import { CardVisual } from "./CardVisual";
import "./AddCardSheet.css";

interface AddCardSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewCardInput) => Promise<void>;
}

export function AddCardSheet({ open, onClose, onSubmit }: AddCardSheetProps) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [color, setColor] = useState(CARD_COLOR_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const digits = onlyDigits(number);
  const network = useMemo(() => detectNetwork(digits), [digits]);
  const maxLen = Math.max(...expectedLengths(network));
  const cvvLen = CVV_LENGTH(network);

  const [expMonth, expYear] = expiry.split("/");

  const previewCard = {
    id: "preview",
    number: digits,
    holder: holder.toUpperCase(),
    expMonth: expMonth || "",
    expYear: expYear || "",
    cvv,
    bank,
    network,
    color,
    createdAt: 0,
  };

  const reset = () => {
    setNumber("");
    setExpiry("");
    setCvv("");
    setHolder("");
    setBank("");
    setColor(CARD_COLOR_PRESETS[0]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (digits.length < 12) {
      setError("Numéro de carte incomplet.");
      return;
    }
    if (!luhnValid(digits)) {
      setError("Ce numéro de carte semble invalide.");
      return;
    }
    const [mm, yy] = expiry.split("/");
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
      setError("Date d'expiration invalide (MM/YY).");
      return;
    }
    const monthNum = parseInt(mm, 10);
    if (monthNum < 1 || monthNum > 12) {
      setError("Mois d'expiration invalide.");
      return;
    }
    if (isExpired(mm, yy)) {
      setError("Cette carte semble déjà expirée.");
      return;
    }
    if (cvv.length !== cvvLen) {
      setError(`CVV invalide (${cvvLen} chiffres attendus).`);
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        number: digits,
        holder: holder.trim().toUpperCase(),
        expMonth: mm,
        expYear: yy,
        cvv,
        bank: bank.trim(),
        color,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <div className="sheet-overlay">
          <motion.div
            className="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <div className="sheet__handle" />
            <div className="sheet__header">
              <h2>Nouvelle carte</h2>
              <button className="sheet__close" onClick={handleClose} aria-label="Fermer">
                ×
              </button>
            </div>

            <div className="sheet__preview">
              <CardVisual card={previewCard} interactive={false} revealed />
            </div>

            <form className="sheet__form" onSubmit={handleSubmit}>
              <label className="field">
                <span className="field__label">
                  Numéro de carte
                  {network !== "unknown" && (
                    <span className="field__badge">{NETWORK_LABELS[network]}</span>
                  )}
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  value={formatPAN(number, network)}
                  onChange={(e) => {
                    const d = onlyDigits(e.target.value).slice(0, maxLen);
                    setNumber(d);
                  }}
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field__label">Expiration</span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
                    maxLength={5}
                  />
                </label>
                <label className="field">
                  <span className="field__label">CVV</span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder={"•".repeat(cvvLen)}
                    value={cvv}
                    onChange={(e) =>
                      setCvv(onlyDigits(e.target.value).slice(0, cvvLen))
                    }
                    maxLength={cvvLen}
                  />
                </label>
              </div>

              <label className="field">
                <span className="field__label">Titulaire</span>
                <input
                  autoComplete="cc-name"
                  placeholder="PRENOM NOM"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field__label">Banque</span>
                <input
                  list="bank-suggestions"
                  placeholder="ex. Revolut, Crédit Agricole…"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                />
                <datalist id="bank-suggestions">
                  {KNOWN_BANKS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>

              <div className="field">
                <span className="field__label">Couleur</span>
                <div className="color-picker">
                  {CARD_COLOR_PRESETS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`color-swatch ${color === c ? "color-swatch--active" : ""}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="sheet__error">{error}</p>}

              <button type="submit" className="sheet__submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Ajouter au portefeuille"}
              </button>
              <p className="sheet__note">
                Stocké chiffré, uniquement sur cet appareil. Jamais transmis en ligne.
              </p>
            </form>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
