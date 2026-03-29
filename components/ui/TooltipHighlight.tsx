'use client';

import { useEffect, useState, useRef, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface TooltipHighlightProps {
  targetRef: RefObject<HTMLElement | null>;
  message: string;
  visible: boolean;
  onDismiss?: () => void;
  position?: 'top' | 'bottom';
}

export default function TooltipHighlight({
  targetRef,
  message,
  visible,
  onDismiss,
  position = 'bottom',
}: TooltipHighlightProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only portal after client hydration
  useEffect(() => setMounted(true), []);

  // Track target element position (viewport-relative via getBoundingClientRect)
  useEffect(() => {
    if (!visible || !targetRef.current) {
      setRect(null);
      return;
    }

    function update() {
      if (!targetRef.current) return;
      setRect(targetRef.current.getBoundingClientRect());
    }

    update();
    const id = setInterval(update, 200); // keep synced during scroll/resize/layout shifts
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [visible, targetRef]);

  // Scroll target into view when tooltip appears
  useEffect(() => {
    if (visible && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [visible, targetRef]);

  // Dismiss on click outside the tooltip
  useEffect(() => {
    if (!visible || !onDismiss) return;
    function handleClick(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        targetRef.current &&
        !targetRef.current.contains(e.target as Node)
      ) {
        onDismiss?.();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible, onDismiss, targetRef]);

  if (!visible || !rect || !mounted) return null;

  const isBottom = position === 'bottom';

  const overlay = (
    <>
      {/* Pulsing ring overlay around the target element */}
      <div
        className="pointer-events-none fixed z-[9990]"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      >
        <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse" />
        <div className="absolute inset-0 rounded-xl ring-4 ring-primary/20 animate-ping-slow" />
      </div>

      {/* Tooltip bubble */}
      <div
        ref={tooltipRef}
        className="fixed z-[9991] animate-fadeIn"
        style={{
          left: rect.left + rect.width / 2,
          ...(isBottom
            ? { top: rect.top + rect.height + 12 }
            : { top: rect.top - 12 }),
          transform: isBottom
            ? 'translateX(-50%)'
            : 'translateX(-50%) translateY(-100%)',
        }}
      >
        <div className="relative bg-primary text-white px-4 py-3 rounded-xl shadow-xl shadow-primary/30 max-w-xs text-center">
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 ${
              isBottom ? '-top-1.5' : '-bottom-1.5'
            }`}
          />
          <p className="text-sm font-semibold relative z-10">{message}</p>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white transition-colors"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}
