import { motion } from "framer-motion";
import type { WalletCard } from "../types";
import { CardVisual } from "./CardVisual";
import "./WalletDeck.css";

interface WalletDeckProps {
  cards: WalletCard[];
  onSelect: (card: WalletCard) => void;
  onAddClick: () => void;
}

const STACK_GAP = 54;
const HEADER_OFFSET = 78;

export function WalletDeck({ cards, onSelect, onAddClick }: WalletDeckProps) {
  if (cards.length === 0) {
    return (
      <div className="wallet-empty">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="wallet-empty__card"
        >
          <div className="wallet-empty__illustration">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="6.5" cy="14.5" r="0.9" fill="currentColor" />
            </svg>
          </div>
          <h2>Aucune carte pour l'instant</h2>
          <p>Ajoutez votre première carte pour commencer votre portefeuille.</p>
          <button className="wallet-empty__cta" onClick={onAddClick}>
            + Nouvelle carte
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="wallet-deck">
      <div className="wallet-deck__scroll">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            className="wallet-deck__item"
            style={{ top: HEADER_OFFSET + index * STACK_GAP, zIndex: index + 1 }}
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(card)}
          >
            <CardVisual card={card} />
          </motion.div>
        ))}
        <div
          className="wallet-deck__spacer"
          style={{ height: HEADER_OFFSET + cards.length * STACK_GAP + 40 }}
          aria-hidden
        />
      </div>
    </div>
  );
}
