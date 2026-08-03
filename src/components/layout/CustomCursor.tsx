'use client';

import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add('cursor-hidden');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    let raf = 0;
    const tick = () => {
      rx += (x - rx) * 0.15;
      ry += (y - ry) * 0.15;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const interactive = 'a, button, [role="button"], input, textarea, select, label';
    const onOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(interactive)) setHover(true);
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(interactive)) setHover(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    window.addEventListener('mouseout', onOut);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mouseout', onOut);
      document.documentElement.classList.remove('cursor-hidden');
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[999] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-gold-100 mix-blend-difference"
        style={{ transition: 'width .3s ease, height .3s ease' }}
      />
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[999] rounded-full border border-gold/60 mix-blend-difference"
        style={{
          width: hover ? 60 : 32,
          height: hover ? 60 : 32,
          marginLeft: hover ? -30 : -16,
          marginTop: hover ? -30 : -16,
          transition:
            'width .35s cubic-bezier(.22,1,.36,1), height .35s cubic-bezier(.22,1,.36,1), margin .35s ease, border-color .3s ease'
        }}
      />
    </>
  );
}
