import { MapPin, ShieldCheck, TrendingUp } from 'lucide-react';

const partners = ['Bank Windhoek', 'FNB Namibia', 'Standard Bank', 'NHP'] as const;

export default function MarketingTrustStrip() {
  return (
    <div className="marketing-trust-strip">
      <div className="marketing-trust-strip__badges" aria-label="Trust indicators">
        <span className="marketing-trust-strip__pill">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Windhoek · Namibia
        </span>
        <span className="marketing-trust-strip__pill">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          POPIA-aligned
        </span>
        <span className="marketing-trust-strip__pill">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          Payment-verified data
        </span>
      </div>
      <div className="marketing-trust-strip__logos" aria-label="Partner ecosystem">
        {partners.map((name) => (
          <span key={name} className="marketing-logo-pill">
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
