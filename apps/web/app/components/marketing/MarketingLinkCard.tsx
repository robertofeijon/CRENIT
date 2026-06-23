import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type MarketingLinkCardProps = {
  href: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  featured?: boolean;
};

export default function MarketingLinkCard({ href, title, description, icon: Icon, featured }: MarketingLinkCardProps) {
  return (
    <Link
      href={href}
      className={`marketing-link-card group ${featured ? 'marketing-link-card--featured' : ''}`}
    >
      {Icon ? (
        <div className={`marketing-link-card__icon ${featured ? 'marketing-link-card__icon--featured' : ''}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
      ) : null}
      <h2 className="marketing-link-card__title">{title}</h2>
      <p className="marketing-link-card__desc">{description}</p>
      <span className="marketing-link-card__cta">
        Learn more <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
