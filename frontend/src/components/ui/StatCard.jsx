import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "./StatusBadge";

function parseNumericDisplay(value) {
  const text = String(value ?? "");
  const match = text.match(/-?[\d,]+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const numeric = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return {
    value: numeric,
    prefix: text.slice(0, match.index),
    suffix: text.slice((match.index || 0) + match[0].length),
    decimals: (match[0].split(".")[1] || "").length
  };
}

function formatNumber(numberValue, decimals) {
  return numberValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function StatCard({ label, value, tone = "neutral", status, helper }) {
  const parsed = useMemo(() => parseNumericDisplay(value), [value]);
  const [displayValue, setDisplayValue] = useState(String(value ?? ""));
  const containerRef = useRef(null);

  useEffect(() => {
    if (!parsed) {
      setDisplayValue(String(value ?? ""));
      return undefined;
    }

    let rafId = 0;
    let started = false;
    let observer;
    const target = parsed.value;
    const durationMs = 900;
    const startAt = performance.now();

    const step = (now) => {
      const elapsed = now - startAt;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = target * eased;
      const rounded = parsed.decimals ? Number(next.toFixed(parsed.decimals)) : Math.round(next);
      setDisplayValue(`${parsed.prefix}${formatNumber(rounded, parsed.decimals)}${parsed.suffix}`);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    const start = () => {
      if (started) {
        return;
      }
      started = true;
      setDisplayValue(`${parsed.prefix}${formatNumber(0, parsed.decimals)}${parsed.suffix}`);
      rafId = window.requestAnimationFrame(step);
    };

    if (containerRef.current && "IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            start();
            observer?.disconnect();
          }
        });
      }, { threshold: 0.35 });
      observer.observe(containerRef.current);
    } else {
      start();
    }

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      observer?.disconnect();
    };
  }, [parsed, value]);

  return (
    <article ref={containerRef} className={`stat-card ${tone}`}>
      <p className="label">{label}</p>
      <h3>{parsed ? displayValue : value}</h3>
      {status ? <StatusBadge status={status} /> : null}
      {helper ? <p className="helper">{helper}</p> : null}
    </article>
  );
}
