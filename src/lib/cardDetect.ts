import type { CardNetwork } from "../types";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Standard, publicly documented IIN/BIN prefix ranges per card network. */
export function detectNetwork(rawNumber: string): CardNetwork {
  const num = onlyDigits(rawNumber);
  if (!num) return "unknown";

  const prefix2 = parseInt(num.slice(0, 2), 10);
  const prefix3 = parseInt(num.slice(0, 3), 10);
  const prefix4 = parseInt(num.slice(0, 4), 10);
  const prefix6 = parseInt(num.slice(0, 6), 10);

  if (num[0] === "4") return "visa";

  if (
    (prefix2 >= 51 && prefix2 <= 55) ||
    (prefix4 >= 2221 && prefix4 <= 2720)
  ) {
    return "mastercard";
  }

  if (prefix2 === 34 || prefix2 === 37) return "amex";

  if (
    prefix4 === 6011 ||
    prefix2 === 65 ||
    (prefix3 >= 644 && prefix3 <= 649) ||
    (prefix6 >= 622126 && prefix6 <= 622925)
  ) {
    return "discover";
  }

  if (prefix4 >= 3528 && prefix4 <= 3589) return "jcb";

  if (
    (prefix3 >= 300 && prefix3 <= 305) ||
    prefix2 === 36 ||
    prefix2 === 38 ||
    prefix2 === 39
  ) {
    return "diners";
  }

  if (prefix2 === 62) return "unionpay";

  if (
    prefix2 === 50 ||
    (prefix2 >= 56 && prefix2 <= 58) ||
    prefix4 === 6304 ||
    prefix4 === 6390 ||
    prefix2 === 67
  ) {
    return "maestro";
  }

  return "unknown";
}

export const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  unionpay: "UnionPay",
  maestro: "Maestro",
  unknown: "Carte",
};

/** Expected PAN length(s) for a network, used for input caps + Luhn checks. */
export function expectedLengths(network: CardNetwork): number[] {
  switch (network) {
    case "amex":
      return [15];
    case "diners":
      return [14];
    case "unknown":
      return [12, 13, 14, 15, 16, 17, 18, 19];
    default:
      return [16];
  }
}

export function luhnValid(rawNumber: string): boolean {
  const num = onlyDigits(rawNumber);
  if (num.length < 12) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/** Groups digits the way each network prints them on a physical card. */
export function formatPAN(rawNumber: string, network: CardNetwork): string {
  const num = onlyDigits(rawNumber);
  const groups: number[] = network === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const parts: string[] = [];
  let idx = 0;
  for (const size of groups) {
    if (idx >= num.length) break;
    parts.push(num.slice(idx, idx + size));
    idx += size;
  }
  return parts.join(" ");
}

export function maskPAN(rawNumber: string, network: CardNetwork): string {
  const num = onlyDigits(rawNumber);
  const last = num.slice(-4);
  const groups: number[] = network === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  let remaining = Math.max(num.length - 4, 0);
  const parts: string[] = [];
  for (const size of groups) {
    if (remaining <= 0) break;
    const take = Math.min(size, remaining);
    parts.push("•".repeat(take));
    remaining -= take;
  }
  const masked = parts.join(" ");
  return masked ? `${masked} ${last}` : last;
}

export function formatExpiryInput(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function isExpired(month: string, year: string): boolean {
  if (!month || !year) return false;
  const m = parseInt(month, 10);
  const y = parseInt(year, 10) + 2000;
  if (!m || !y) return false;
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;
  return y < currentY || (y === currentY && m < currentM);
}

export const CVV_LENGTH = (network: CardNetwork): number =>
  network === "amex" ? 4 : 3;

// Deliberately no PAN-prefix -> bank guessing here: without a licensed BIN
// database, short prefixes are ambiguous across issuers and would produce
// confident-looking but wrong suggestions. Network detection above (Visa,
// Mastercard, Amex...) relies on standardized, public IIN ranges and is
// reliable; the bank name is asked from the user instead, with an
// autocomplete list of common banks as a convenience.
export const KNOWN_BANKS = [
  "Revolut",
  "N26",
  "Crédit Agricole",
  "BNP Paribas",
  "Société Générale",
  "La Banque Postale",
  "LCL",
  "Crédit Mutuel",
  "CIC",
  "Caisse d'Épargne",
  "Banque Populaire",
  "Boursorama Banque",
  "Monabanq",
  "Fortuneo",
  "Hello bank!",
  "ING",
  "Wise",
  "Monzo",
  "Starling Bank",
  "bunq",
  "American Express",
];
