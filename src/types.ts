export type CardNetwork =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "jcb"
  | "diners"
  | "unionpay"
  | "maestro"
  | "unknown";

export interface WalletCard {
  id: string;
  /** Full PAN, digits only. Never leaves the device. */
  number: string;
  holder: string;
  expMonth: string; // "01".."12"
  expYear: string; // "25" (2 digits, YY)
  cvv: string;
  bank: string;
  network: CardNetwork;
  color: string; // hex accent chosen by user or derived from bank/network
  createdAt: number;
}

export type NewCardInput = Omit<WalletCard, "id" | "createdAt" | "network">;

export interface VaultMeta {
  salt: number[];
  verifier: {
    iv: number[];
    data: number[];
  };
}
