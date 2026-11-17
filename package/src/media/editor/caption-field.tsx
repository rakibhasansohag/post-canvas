'use client';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { textLimits } from '../rules';

/** Props of `CaptionField`. */
export interface CaptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter (without Shift) leaves the field, to the text after the block. */
  onLeave: () => void;
  label: string;
  placeholder: string;
  className?: string;
}

/**
 * The caption, edited in place under a picture: a text area that grows with its text. It keeps its own copy while it
 * has focus, so undo from outside updates it but typing never fights the document.
 */
export function CaptionField({ value, onChange, onLeave, label, placeholder, className }: CaptionFieldProps) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const shown = focused ? draft : value;

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [shown]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onLeave();
    } else if (event.key === 'Escape') {
      event.currentTarget.blur();
    }
  }

  return (
    <textarea
      ref={field}
      className={['pc-caption-field', className].filter(Boolean).join(' ')}
      rows={1}
      value={shown}
      maxLength={textLimits.caption}
      aria-label={label}
      placeholder={placeholder}
      onFocus={() => {
        setDraft(value);
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
    />
  );
}
