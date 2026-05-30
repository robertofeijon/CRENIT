"use client";

import { useEffect, useState } from "react";

type Props = {
  value: string;
  play?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Renders a <span> so it can live inside headings without invalid HTML. */
export default function NumberCounter({ value, play = true, className = "", style }: Props) {
  const [count, setCount] = useState(value);
  const [forcedPlay, setForcedPlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!play && !forcedPlay) return;
    const m = value.match(/\d+/);
    if (!m) return;
    const target = parseInt(m[0], 10);
    if (isNaN(target) || target <= 0) return;

    let start = 0;
    const duration = 900;
    const stepTime = Math.max(12, Math.floor(duration / target));

    const timer = setInterval(() => {
      start += 1;
      if (start >= target) {
        clearInterval(timer);
        setCount(value);
      } else {
        setCount(value.replace(m[0], String(start)));
      }
    }, stepTime);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, play, mounted, forcedPlay]);

  useEffect(() => {
    const handler = () => setForcedPlay(true);
    window.addEventListener("rc:force-reveal", handler as EventListener);
    return () => window.removeEventListener("rc:force-reveal", handler as EventListener);
  }, []);

  return (
    <span className={className} style={style} suppressHydrationWarning>
      {mounted && (play || forcedPlay) ? count : value}
    </span>
  );
}
