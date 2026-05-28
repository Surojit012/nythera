'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CountUpProps {
  end: string;
  duration?: number;
  className?: string;
}

export default function CountUp({ end, duration = 2000, className = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(end);
  const [hasAnimated, setHasAnimated] = useState(false);

  const animateValue = useCallback(() => {
    // Extract numeric part
    const numMatch = end.match(/[\d.]+/);
    if (!numMatch) {
      setDisplay(end);
      return;
    }

    const numericEnd = parseFloat(numMatch[0]);
    const prefix = end.substring(0, end.indexOf(numMatch[0]));
    const suffix = end.substring(end.indexOf(numMatch[0]) + numMatch[0].length);
    const isDecimal = numMatch[0].includes('.');
    const startTime = performance.now();

    function update(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = numericEnd * eased;

      if (isDecimal) {
        setDisplay(`${prefix}${current.toFixed(1)}${suffix}`);
      } else {
        setDisplay(`${prefix}${Math.floor(current)}${suffix}`);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplay(end);
      }
    }

    requestAnimationFrame(update);
  }, [duration, end]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateValue();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animateValue, hasAnimated]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
