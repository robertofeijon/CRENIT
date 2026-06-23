'use client';

type ScoreRingMiniProps = {
  score: number | string;
  tier?: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_CONFIG = {
  sm: { dim: 88, stroke: 7, valueClass: 'text-xl', tierClass: 'text-[10px]' },
  md: { dim: 112, stroke: 9, valueClass: 'text-xl', tierClass: 'text-[10px]' },
  lg: { dim: 160, stroke: 11, valueClass: 'text-4xl', tierClass: 'text-xs' },
};

export default function ScoreRingMini({ score, tier, size = 'md' }: ScoreRingMiniProps) {
  const numeric = typeof score === 'number' ? score : parseInt(String(score), 10);
  const ratio = Number.isFinite(numeric) ? Math.max(0, Math.min(1, (numeric - 300) / 600)) : 0;
  const { dim, stroke, valueClass, tierClass } = SIZE_CONFIG[size];
  const r = (dim - stroke * 2) / 2;
  const cx = dim / 2;
  const cy = dim / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * ratio;

  return (
    <div className="score-ring-mini" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} role="img" aria-label={`Credit score ${score}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--rc-border)"
          strokeWidth={stroke}
          opacity={0.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#C0392B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="score-ring-mini__arc"
        />
      </svg>
      <div className="score-ring-mini__label">
        <span className={`score-ring-mini__value ${valueClass}`}>{score}</span>
        {tier ? <span className={`score-ring-mini__tier ${tierClass}`}>{tier}</span> : null}
      </div>
    </div>
  );
}
