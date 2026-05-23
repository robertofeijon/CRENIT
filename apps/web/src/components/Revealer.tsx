"use client";

import React from 'react';
import useInView from '../lib/useInView';

type Props = {
  children: React.ReactNode | ((inView: boolean) => React.ReactNode);
  className?: string;
  delay?: number;
};

export default function Revealer({ children, className = '', delay = 0 }: Props) {
  const [ref, inView] = useInView();
  const [forced, setForced] = React.useState(false);

  React.useEffect(() => {
    const h = () => setForced(true);
    window.addEventListener('rc:force-reveal', h as EventListener);
    return () => window.removeEventListener('rc:force-reveal', h as EventListener);
  }, []);

  const visible = inView || forced;
  const content = typeof children === 'function' ? children(visible) : children;

  return (
    <div
      ref={ref as any}
      className={`${visible ? 'revealed' : 'to-reveal'} ${className}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {content}
    </div>
  );
}
