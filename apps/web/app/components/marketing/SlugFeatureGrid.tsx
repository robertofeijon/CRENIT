'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  Check,
  CreditCard,
  FileCheck2,
  HelpCircle,
  Landmark,
  Mail,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import MarketingSectionReveal from './MarketingSectionReveal';

const slugIcons: Record<string, LucideIcon[]> = {
  'products/rent-payments': [Wallet, FileCheck2, BarChart3],
  'products/credit-score': [TrendingUp, ShieldCheck, Landmark],
  'products/deposit-management': [ShieldCheck, FileCheck2, CreditCard],
  'products/market-data': [BarChart3, TrendingUp, Building2],
  'solutions/for-tenants': [UserRound, TrendingUp, FileCheck2],
  'solutions/for-landlords': [Building2, Wallet, BarChart3],
  'solutions/for-banks-lenders': [Landmark, ShieldCheck, BarChart3],
  'solutions/for-developers': [Building2, BarChart3, TrendingUp],
  'company/about-us': [ShieldCheck, TrendingUp, Building2],
  'company/how-it-works': [Wallet, TrendingUp, FileCheck2],
  'company/contact': [Mail, HelpCircle, UserRound],
};

type SlugFeatureGridProps = {
  bullets: string[];
  pageKey?: string;
};

export default function SlugFeatureGrid({ bullets, pageKey }: SlugFeatureGridProps) {
  const icons = pageKey ? slugIcons[pageKey] : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {bullets.map((item, index) => {
        const Icon = icons?.[index] ?? Check;
        return (
          <MarketingSectionReveal key={item} delay={index * 80}>
            <div className="marketing-bullet-tile marketing-bullet-tile--icon h-full">
              <span className="marketing-bullet-tile__icon" aria-hidden>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="marketing-bullet-tile__text">{item}</p>
            </div>
          </MarketingSectionReveal>
        );
      })}
    </div>
  );
}
