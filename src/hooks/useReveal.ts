import { useEffect, useRef, useState } from 'react';

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Use requestAnimationFrame to batch observations
    let rafId: number;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          rafId = requestAnimationFrame(() => {
            setRevealed(true);
          });
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      },
    );
    observer.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return { ref, revealed };
}
