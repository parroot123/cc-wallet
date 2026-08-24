import type { CardNetwork } from "../types";

export function NetworkLogo({ network }: { network: CardNetwork }) {
  switch (network) {
    case "visa":
      return <span className="network-logo network-logo--visa">VISA</span>;
    case "mastercard":
      return (
        <span className="network-logo network-logo--mc">
          <span className="mc-circle mc-circle--a" />
          <span className="mc-circle mc-circle--b" />
        </span>
      );
    case "amex":
      return <span className="network-logo network-logo--amex">AMEX</span>;
    case "discover":
      return <span className="network-logo network-logo--discover">Discover</span>;
    case "jcb":
      return <span className="network-logo network-logo--jcb">JCB</span>;
    case "diners":
      return <span className="network-logo network-logo--diners">Diners</span>;
    case "unionpay":
      return <span className="network-logo network-logo--unionpay">UnionPay</span>;
    case "maestro":
      return (
        <span className="network-logo network-logo--mc">
          <span className="mc-circle mc-circle--a" />
          <span className="mc-circle mc-circle--b" />
        </span>
      );
    default:
      return <span className="network-logo network-logo--generic">CARD</span>;
  }
}
