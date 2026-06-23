'use client';

import { useEffect, useMemo, useState } from 'react';

function ScoreGauge({ score }: { score: number }) {
  const ratio = useMemo(() => Math.max(0, Math.min(1, (score - 300) / 600)), [score]);
  const needle = useMemo(() => {
    const angle = Math.PI - ratio * Math.PI;
    const length = 64;
    return { x: 120 + Math.cos(angle) * length, y: 100 - Math.sin(angle) * length };
  }, [ratio]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/90 via-[#fff7f7]/90 to-[#fdecec]/95 p-5 shadow-[0_14px_28px_rgba(127,29,29,0.1)] backdrop-blur-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Rental credit score</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-[#7f1d1d]">{score}</p>
        </div>
        <span className="rounded-full border border-[#f1cfcc] bg-white/85 px-3 py-1 text-xs font-medium text-[#7f1d1d] shadow-sm">Good</span>
      </div>
      <svg viewBox="0 0 240 120" className="mt-3 h-[96px] w-full" role="img" aria-label={`Rental credit score gauge showing ${score}`}>
        <path d="M20 100 A100 100 0 0 1 220 100" fill="none" stroke="#f1d7d5" strokeWidth="14" />
        <path
          d="M30 100 A90 90 0 0 1 210 100"
          fill="none"
          stroke="#C0392B"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(2, ratio * 100)} 100`}
        />
        <circle cx="120" cy="100" r="6" fill="#7f1d1d" />
        <line x1="120" y1="100" x2={needle.x} y2={needle.y} stroke="#7f1d1d" strokeWidth="4" strokeLinecap="round" />
        <circle cx={needle.x} cy={needle.y} r="3.5" fill="#C0392B" />
      </svg>
      <p className="mt-2 text-center text-xs text-slate-500">300 — 900 · Updated on verified payment</p>
    </div>
  );
}

export default function HeroScoreCard() {
  const [score, setScore] = useState(742);

  useEffect(() => {
    const start = performance.now();
    const durationMs = 900;
    const from = 300;
    const to = 742;
    let rafId = 0;
    setScore(from);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2);
      setScore(Math.round(from + (to - from) * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="hero-score-card shimmer-border relative overflow-hidden rounded-3xl border border-white/65 bg-gradient-to-br from-white/90 via-[#fff8f7]/92 to-[#fce8e7]/95 p-6 shadow-[0_24px_44px_rgba(127,29,29,0.14)] backdrop-blur-md dark:border-[var(--rc-border)] dark:from-[var(--rc-card)] dark:via-[var(--rc-card-alt)] dark:to-[var(--rc-elevated)] sm:p-8">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#C0392B]/15 blur-2xl"
        aria-hidden
      />
      <p className="text-xs font-medium uppercase tracking-widest text-[#7f1d1d]">Tenant dashboard</p>
      <p className="mt-3 text-xl font-medium leading-snug text-[#1A1A1A]">
        Payment history, score, and downloadable reports—in one place.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Last payment', value: 'On time · Mar 2026' },
          { label: 'Lease', value: 'Khomasdal · Active' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/75 bg-white/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-sm">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-medium text-[#1A1A1A]">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ScoreGauge score={score} />
      </div>
    </div>
  );
}
