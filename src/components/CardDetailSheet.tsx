import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WalletCard } from "../types";
import { CardVisual } from "./CardVisual";
import { formatPAN, NETWORK_LABELS } from "../lib/cardDetect";
import "./CardDetailSheet.css";

interface CardDetailSheetProps {
  card: WalletCard | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

const AUTO_HIDE_MS = 15_000;

export function CardDetailSheet({ card, onClose, onDelete }: CardDetailSheetProps) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Reset per-card UI state during render when the shown card changes,
  // instead of in an Effect — this component stays mounted (so
  // AnimatePresence can animate the close transition), so a `key` remount
  // isn't an option here.
  const [shownId, setShownId] = useState(card?.id);
  if (card?.id !== shownId) {
    setShownId(card?.id);
    setFlipped(false);
    setRevealed(false);
    setConfirmDelete(false);
  }

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setRevealed(false), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [revealed]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API unavailable — silently ignore, nothing sensitive leaks.
    }
  };

  return (
    <AnimatePresence>
      {card && (
        <>
          <motion.div
            className="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="detail-overlay">
          <motion.div
            className="detail-panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <button className="detail-panel__close" onClick={onClose} aria-label="Fermer">
              ×
            </button>

            <div className="detail-panel__stage" onClick={() => setFlipped((f) => !f)}>
              <motion.div
                className="detail-panel__flipper"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <div className="detail-panel__side detail-panel__side--front">
                  <CardVisual card={card} revealed={revealed} interactive={false} />
                </div>
                <div className="detail-panel__side detail-panel__side--back">
                  <CardVisual card={card} revealed={revealed} side="back" interactive={false} />
                </div>
              </motion.div>
            </div>
            <p className="detail-panel__hint">Touchez la carte pour la retourner</p>

            <div className="detail-panel__actions">
              <button
                className={`pill-btn ${revealed ? "pill-btn--active" : ""}`}
                onClick={() => setRevealed((r) => !r)}
              >
                {revealed ? "Masquer" : "Afficher les détails"}
              </button>
              <button
                className="pill-btn"
                onClick={() => copy("number", card.number)}
                disabled={!revealed}
              >
                {copied === "number" ? "Copié !" : "Copier le numéro"}
              </button>
              <button
                className="pill-btn"
                onClick={() => copy("cvv", card.cvv)}
                disabled={!revealed}
              >
                {copied === "cvv" ? "Copié !" : "Copier le CVV"}
              </button>
            </div>

            <dl className="detail-panel__meta">
              <div>
                <dt>Banque</dt>
                <dd>{card.bank || "Non renseignée"}</dd>
              </div>
              <div>
                <dt>Réseau</dt>
                <dd>{NETWORK_LABELS[card.network]}</dd>
              </div>
              <div>
                <dt>Numéro</dt>
                <dd>{revealed ? formatPAN(card.number, card.network) : "•••• •••• •••• " + card.number.slice(-4)}</dd>
              </div>
              <div>
                <dt>Expire</dt>
                <dd>{card.expMonth}/{card.expYear}</dd>
              </div>
            </dl>

            {!confirmDelete ? (
              <button className="detail-panel__delete" onClick={() => setConfirmDelete(true)}>
                Supprimer cette carte
              </button>
            ) : (
              <div className="detail-panel__confirm">
                <span>Supprimer définitivement ?</span>
                <div className="detail-panel__confirm-actions">
                  <button className="pill-btn" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </button>
                  <button
                    className="pill-btn pill-btn--danger"
                    onClick={() => onDelete(card.id)}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
