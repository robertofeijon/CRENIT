'use client';

import { useEffect, useState } from 'react';

/** True on narrow viewports or mobile user-agents (for camera capture UX). */
export function useIsMobile(breakpointPx = 768) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
    const update = () => setMobile(mq.matches || uaMobile);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);

  return mobile;
}
