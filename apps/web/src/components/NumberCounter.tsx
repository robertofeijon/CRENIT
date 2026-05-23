"use client";

import { useEffect, useState } from "react";

type Props = { value: string; play?: boolean; className?: string; style?: React.CSSProperties };

export default function NumberCounter({ value, play = true, className = "", style }: Props) {
  const [count, setCount] = useState<string>(value);
  const [forcedPlay, setForcedPlay] = useState(false);

  useEffect(() => {
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
  }, [value, play]);

  useEffect(() => {
    const handler = () => setForcedPlay(true);
    window.addEventListener('rc:force-reveal', handler as EventListener);
    return () => window.removeEventListener('rc:force-reveal', handler as EventListener);
  }, []);

  return (
    <div className={className} style={style}>
      {count}
    </div>
  );
}
