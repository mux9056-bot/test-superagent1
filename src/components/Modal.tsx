import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const modalStack: symbol[] = [];
let scrollLocks = 0;
let bodyOverflow = '';

function lockBodyScroll() {
  if (scrollLocks === 0) {
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockBodyScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = bodyOverflow;
}

function focusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  );
}

export type ModalVariant = 'panel' | 'dialog';

interface ModalProps {
  labelledBy: string;
  children: ReactNode;
  onRequestClose: () => void;
  variant?: ModalVariant;
  className?: string;
}

/**
 * Accessible modal: focus moves in, Tab is trapped, Escape requests close, and
 * focus returns to the trigger afterwards. Rendered in a portal so it is never
 * clipped by the scrolling task list.
 */
export function Modal({
  labelledBy,
  children,
  onRequestClose,
  variant = 'dialog',
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const stackId = useRef<symbol>(Symbol('modal'));

  useEffect(() => {
    const id = stackId.current;
    modalStack.push(id);
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();

    const dialog = dialogRef.current;
    const autofocus = dialog?.querySelector<HTMLElement>('[data-autofocus]');
    const target = autofocus ?? focusableElements(dialog)[0] ?? dialog;
    target?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (modalStack[modalStack.length - 1] !== id) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = focusableElements(dialogRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = modalStack.indexOf(id);
      if (index >= 0) modalStack.splice(index, 1);
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className={`modal-overlay modal-overlay-${variant}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`modal-surface modal-${variant}${className ? ` ${className}` : ''}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function useDialogTitleId(prefix: string): string {
  return `${prefix}-${useId().replace(/:/g, '')}`;
}
