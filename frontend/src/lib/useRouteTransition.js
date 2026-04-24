import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export function useRouteTransition(durationMs = 260) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return undefined;
    }

    setIsTransitioning(true);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      timerRef.current = null;
    }, durationMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [location.pathname, durationMs]);

  return { isTransitioning };
}
