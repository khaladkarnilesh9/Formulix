import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function useDialogFocus(open: boolean, panel: React.RefObject<HTMLDivElement | null>, onClose: () => void, closeOnDesktop = false) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-background]'));
    const inertValues = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex="0"]'
      ) ?? []).filter(element => element.getClientRects().length && !element.hasAttribute('disabled'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const handleResize = () => { if (closeOnDesktop && window.matchMedia('(min-width: 1024px)').matches) close.current(); };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => { element.inert = inertValues[index]; });
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, closeOnDesktop]);
}

export function MobileDrawer({ open, onClose, label, children }: {
  open: boolean; onClose: () => void; label: string; children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panel, onClose, true);

  if (!open) return null;
  return createPortal(<div className="mobile-drawer fixed inset-0 z-[60] lg:hidden">
    <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-hidden="true" />
    <div ref={panel} role="dialog" aria-modal="true" aria-label={label}
      className="mobile-drawer-panel absolute inset-y-0 left-0 bg-white dark:bg-slate-950">
      <button onClick={onClose} aria-label="Close navigation" title="Close navigation"
        className="drawer-close absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <X size={20} />
      </button>
      {children}
    </div>
  </div>, document.body);
}
