import { forwardRef } from "react";
import type { WalletCard } from "../types";
import { formatPAN, maskPAN, NETWORK_LABELS } from "../lib/cardDetect";
import { cardGradient, contrastText } from "../lib/color";
import { NetworkLogo } from "./NetworkLogo";
import "./CardVisual.css";

interface CardVisualProps {
  card: WalletCard;
  revealed?: boolean;
  side?: "front" | "back";
  interactive?: boolean;
  className?: string;
}

export const CardVisual = forwardRef<HTMLDivElement, CardVisualProps>(
  function CardVisual(
    { card, revealed = false, side = "front", interactive = true, className },
    ref
  ) {
    const text = contrastText(card.color);
    const displayNumber = revealed
      ? formatPAN(card.number, card.network)
      : maskPAN(card.number, card.network);

    return (
      <div
        ref={ref}
        className={`card-visual ${interactive ? "card-visual--interactive" : ""} ${className ?? ""}`}
        style={{
          background: cardGradient(card.color),
          color: text,
        }}
      >
        <div className="card-visual__texture" aria-hidden />
        <div className="card-visual__sheen" aria-hidden />

        {side === "front" ? (
          <div className="card-visual__face card-visual__face--front">
            <div className="card-visual__top">
              <span className="card-visual__bank">{card.bank || "Ma carte"}</span>
              <NetworkLogo network={card.network} />
            </div>

            <div className="card-visual__chip-row">
              <span className="card-visual__chip" aria-hidden>
                <span className="card-visual__chip-lines" />
              </span>
              <svg
                className="card-visual__contactless"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M8.5 8.5a5 5 0 0 1 0 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M11.5 5.5a9 9 0 0 1 0 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <path
                  d="M14.5 2.5a13 13 0 0 1 0 19"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </div>

            <div className="card-visual__number">{displayNumber}</div>

            <div className="card-visual__bottom">
              <div className="card-visual__holder">
                <span className="card-visual__label">Titulaire</span>
                <span className="card-visual__value">
                  {card.holder || "—"}
                </span>
              </div>
              <div className="card-visual__exp">
                <span className="card-visual__label">Exp.</span>
                <span className="card-visual__value">
                  {card.expMonth || "MM"}/{card.expYear || "YY"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-visual__face card-visual__face--back">
            <div className="card-visual__magstripe" />
            <div className="card-visual__cvv-row">
              <span className="card-visual__cvv-band">
                {revealed ? card.cvv : "•".repeat(card.cvv.length || 3)}
              </span>
            </div>
            <div className="card-visual__back-footer">
              <NetworkLogo network={card.network} />
              <span className="card-visual__back-label">
                {NETWORK_LABELS[card.network]}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);
