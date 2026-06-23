import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** hero = full mesh + orbs; subtle = lighter wash for inner sections */
  variant?: 'hero' | 'subtle' | 'auth';
  className?: string;
};

export default function MarketingAtmosphere({ children, variant = 'hero', className = '' }: Props) {
  return (
    <div className={`rc-atmosphere rc-atmosphere--${variant} relative overflow-hidden ${className}`}>
      <div className="rc-atmosphere__mesh pointer-events-none" aria-hidden />
      <div className="rc-atmosphere__orb rc-atmosphere__orb--primary pointer-events-none" aria-hidden />
      <div className="rc-atmosphere__orb rc-atmosphere__orb--secondary pointer-events-none" aria-hidden />
      <div className="rc-atmosphere__grid pointer-events-none" aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
