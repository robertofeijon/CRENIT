import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type MarketingCtaBandProps = {
  eyebrow: string;
  title: ReactNode;
  href: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
};

export default function MarketingCtaBand({
  eyebrow,
  title,
  href,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: MarketingCtaBandProps) {
  return (
    <section className="marketing-section">
      <div className="marketing-container">
        <div className="marketing-cta-band">
          <div className="max-w-2xl">
            <p className="marketing-cta-band__eyebrow">{eyebrow}</p>
            <h2 className="marketing-cta-band__title">{title}</h2>
            {children ? <div className="mt-4 text-sm leading-7 text-white/75">{children}</div> : null}
          </div>
          <div className="marketing-cta-band__actions">
            <Link href={href} className="marketing-cta-band__btn-primary gap-2">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className="marketing-cta-band__btn-ghost">
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
