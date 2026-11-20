import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a dialog while it is open.
 *
 * - focuses the first focusable element on open
 * - cycles Tab / Shift+Tab inside the container
 * - calls `onEscape` when Escape is pressed
 * - restores focus to the previously focused element on close
 *
 * Usage:
 *   const ref = useFocusTrap(open, () => setOpen(false));
 *   return <div ref={ref} role="dialog" aria-modal="true">...</div>;
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onEscape?: () => void,
) {
  const ref = useRef<T | null>(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    const previouslyFocused = (typeof document !== 'undefined'
      ? document.activeElement
      : null) as HTMLElement | null;

    const items = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => {
        if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

    const first = items()[0];
    if (first) first.focus();
    else container?.setAttribute('tabindex', '-1');

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = items();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const current = document.activeElement as HTMLElement | null;
      const index = current ? focusable.indexOf(current) : -1;
      if (event.shiftKey) {
        if (index <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else if (index === -1 || index === focusable.length - 1) {
        event.preventDefault();
        focusable[0].focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return ref;
}
