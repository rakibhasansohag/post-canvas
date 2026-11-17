'use client';
// The status bar: words, characters and read time; the kind badge and why; and the problems that block publishing.
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Popover } from '../core/react/popover';
import type { DocInfo } from './ui-context';
import { useEditorUi } from './ui-context';

/** Props of `StatusBar`. */
export interface StatusBarProps {
  info: DocInfo;
}

/** Statistics, the classifier's badge and reason, and a problems list. */
export function StatusBar({ info }: StatusBarProps) {
  const { t, limits } = useEditorUi();
  const [open, setOpen] = useState(false);
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const { stats, classification, problems } = info;
  const errors = problems.filter((problem) => problem.severity === 'error').length;
  const nearWords = limits.maxWords !== undefined && stats.words > limits.maxWords * 0.9;
  const nearCharacters = limits.maxCharacters !== undefined && stats.characters > limits.maxCharacters * 0.9;

  return (
    <div className="pc-status">
      <div className="pc-status__stats">
        <span data-near={nearWords || undefined}>
          {limits.maxWords !== undefined && nearWords
            ? t('ui.status.wordsOf', { count: stats.words, max: limits.maxWords })
            : t('ui.status.words', { count: stats.words })}
        </span>
        <span aria-hidden="true">·</span>
        <span data-near={nearCharacters || undefined}>
          {limits.maxCharacters !== undefined && nearCharacters
            ? t('ui.status.charactersOf', { count: stats.characters, max: limits.maxCharacters })
            : t('ui.status.characters', { count: stats.characters })}
        </span>
        {stats.words > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>{t('ui.status.read', { minutes: stats.readMinutes })}</span>
          </>
        )}
      </div>
      {classification && (
        <div className="pc-status__kind">
          <span className="pc-badge" data-kind={classification.kind ?? 'empty'}>
            {classification.summary}
          </span>
          {classification.reason && (
            <span className="pc-status__reason">{t('ui.status.reason', { reason: classification.reason })}</span>
          )}
        </div>
      )}
      {problems.length > 0 && (
        <>
          <button
            ref={setButton}
            type="button"
            className="pc-status__problems"
            data-errors={errors > 0 || undefined}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {errors > 0 ? <AlertCircle size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
            {t('ui.status.problems', { count: problems.length })}
          </button>
          <Popover
            open={open}
            anchor={button}
            onClose={() => setOpen(false)}
            label={t('ui.status.problemsTitle')}
            placement="top-end"
            className="pc-problems"
          >
            <p className="pc-problems__title">{t('ui.status.problemsTitle')}</p>
            <ul className="pc-problems__list">
              {problems.map((problem, index) => (
                <li key={`${problem.code}-${problem.nodeId ?? index}`} data-severity={problem.severity}>
                  {problem.severity === 'error' ? (
                    <AlertCircle size={16} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={16} aria-hidden="true" />
                  )}
                  <span>
                    <span className="pc-sr-only">
                      {problem.severity === 'error' ? t('ui.status.error') : t('ui.status.warning')}
                    </span>
                    {problem.message}
                  </span>
                </li>
              ))}
            </ul>
          </Popover>
        </>
      )}
    </div>
  );
}
