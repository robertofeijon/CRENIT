'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import api from '../../../src/lib/api';

type Step = {
  id: string;
  label: string;
  status: 'done' | 'pending' | 'blocked';
  eta_days: number;
  href: string;
  blocking: boolean;
};

export default function LandlordReadinessChecklist() {
  const [checklist, setChecklist] = useState<{ steps: Step[]; completed: number; total: number; ready: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/landlords/readiness-checklist')
      .then((res) => setChecklist(res.data.data))
      .catch(() => setChecklist(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!checklist || checklist.ready) return null;

  return (
    <section className="landlord-panel border-[#C0392B]/20 bg-[#FDEDEC]/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">Onboarding checklist</p>
          <h2 className="mt-1 text-lg font-semibold text-[#1A1A1A]">Get partner-ready</h2>
          <p className="mt-1 text-sm text-slate-600">
            {checklist.completed} of {checklist.total} steps complete — finish blocking items to invite tenants and collect
            verified rent.
          </p>
        </div>
        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A]">
          {Math.round((checklist.completed / checklist.total) * 100)}%
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {checklist.steps.map((step) => {
          const Icon = step.status === 'done' ? CheckCircle2 : step.status === 'blocked' ? Lock : Circle;
          const iconClass =
            step.status === 'done' ? 'text-emerald-600' : step.status === 'blocked' ? 'text-slate-300' : 'text-amber-600';
          return (
            <li key={step.id}>
              <Link
                href={step.status === 'blocked' ? '#' : step.href}
                className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  step.status === 'blocked'
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-white text-[#1A1A1A] hover:bg-[#FDEDEC]'
                }`}
                aria-disabled={step.status === 'blocked'}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
                  <span>
                    {step.label}
                    {step.blocking && step.status !== 'done' ? (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                        Required
                      </span>
                    ) : null}
                  </span>
                </span>
                {step.status !== 'done' && step.eta_days > 0 ? (
                  <span className="text-xs text-slate-500">~{step.eta_days}d review</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
