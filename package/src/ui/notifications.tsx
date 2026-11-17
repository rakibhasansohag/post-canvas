'use client';
// Notices: a small toast, also announced through an aria-live region. Errors are announced assertively.
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotifyKind, Translator } from '../core/types';

/** One notice on screen. */
export interface Toast {
  id: number;
  message: string;
  kind: NotifyKind;
}

/** The notify function and what to render. */
export interface Notifications {
  notify: (message: string, kind?: NotifyKind) => void;
  toasts: Toast[];
  dismiss: (id: number) => void;
  /** The latest polite and assertive announcements. */
  live: { polite: string; assertive: string };
}

const lifetime: Record<NotifyKind, number> = { info: 5000, error: 8000 };

/** Keeps the toasts and live messages for one editor. `notify` is stable. */
export function useNotifications(): Notifications {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState({ polite: '', assertive: '' });
  const next = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: NotifyKind = 'info') => {
      const id = ++next.current;
      setToasts((list) => [...list.slice(-2), { id, message, kind }]);
      // A changed string is what a screen reader announces; the counter makes a repeat count as a change.
      setLive((current) => ({
        ...current,
        [kind === 'error' ? 'assertive' : 'polite']: `${message}${id % 2 ? '' : ' '}`,
      }));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), lifetime[kind]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  return { notify, toasts, dismiss, live };
}

/** The toasts and live regions. */
export function NotificationArea({ notifications, t }: { notifications: Notifications; t: Translator }) {
  const { toasts, dismiss, live } = notifications;
  return (
    <>
      <div className="pc-sr-only" aria-live="polite" aria-atomic="true">
        {live.polite}
      </div>
      <div className="pc-sr-only" aria-live="assertive" aria-atomic="true">
        {live.assertive}
      </div>
      {toasts.length > 0 && (
        <div className="pc-toasts">
          {toasts.map((toast) => (
            <div key={toast.id} className="pc-toast" data-kind={toast.kind}>
              <span className="pc-toast__message">{toast.message}</span>
              <button
                type="button"
                className="pc-toast__close"
                aria-label={t('ui.toast.dismiss')}
                onClick={() => dismiss(toast.id)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
