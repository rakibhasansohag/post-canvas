'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

/** A copyable shell command, such as `npm install post-canvas`. */
export function InstallCommand({ command = 'npm install post-canvas', className }: { command?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the command stays selectable.
    }
  };

  return (
    <div
      className={cn(
        'inline-flex min-h-12 max-w-full items-center gap-3 rounded-[14px] border border-current/15 py-1 ps-4 pe-1 font-mono text-[0.92rem]',
        className,
      )}
    >
      <span aria-hidden="true" className="opacity-50 select-none">
        $
      </span>
      <code className="min-w-0 truncate select-all">{command}</code>
      <button
        type="button"
        onClick={copy}
        className="ms-auto grid size-10 shrink-0 place-items-center rounded-[10px] transition-colors duration-200 hover:bg-current/10"
        aria-label={copied ? 'Copied' : `Copy "${command}"`}
      >
        {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied to the clipboard' : ''}
      </span>
    </div>
  );
}
