import React, { useState, useMemo, useRef } from 'react';
import { Game } from '../types/bingo';
import { getBingoLetter } from '../utils/bingoEngine';
import { useLanguage } from '../context/LanguageContext';
import {
  Hash,
  Plus,
  ListPlus,
  Undo2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';

interface DrawnNumbersEntryFormProps {
  activeGame: Game | null;
  onAddNumber: (num: number) => Promise<boolean | void>;
  onAddBatchNumbers: (nums: number[]) => Promise<boolean | void>;
  onUndoLastNumber: () => Promise<boolean | void>;
  isNight: boolean;
  disabled?: boolean;
}

export const DrawnNumbersEntryForm: React.FC<DrawnNumbersEntryFormProps> = ({
  activeGame,
  onAddNumber,
  onAddBatchNumbers,
  onUndoLastNumber,
  isNight,
  disabled = false,
}) => {
  const { t, isAmharic } = useLanguage();
  const [mode, setMode] = useState<'progressive' | 'batch'>('progressive');

  // Progressive Single Ball State
  const [singleInput, setSingleInput] = useState<string>('');
  const [singleError, setSingleError] = useState<string | null>(null);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState<boolean>(false);
  const singleInputRef = useRef<HTMLInputElement>(null);

  // Batch Balls State
  const [batchInput, setBatchInput] = useState<string>('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);

  const calledSet = useMemo(() => {
    return new Set(activeGame?.calledNumbers || []);
  }, [activeGame?.calledNumbers]);

  // Clean and parse single input number
  const parsedSingle = useMemo(() => {
    const cleaned = singleInput.trim().toUpperCase().replace(/[BINGO]/g, '').trim();
    if (!cleaned) return null;
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return null;
    return num;
  }, [singleInput]);

  const singleStatus = useMemo(() => {
    if (!parsedSingle) return null;
    if (parsedSingle < 1 || parsedSingle > 75) {
      return { valid: false, error: t('invalidNumberRange') };
    }
    if (calledSet.has(parsedSingle)) {
      return { valid: false, error: `${parsedSingle} - ${t('numberAlreadyCalled')}` };
    }
    return { valid: true, num: parsedSingle, letter: getBingoLetter(parsedSingle) };
  }, [parsedSingle, calledSet, t]);

  // Handle single ball submission
  const handleSingleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeGame || disabled || isSubmittingSingle) return;
    if (!singleStatus || !singleStatus.valid || !singleStatus.num) {
      if (singleStatus?.error) {
        setSingleError(singleStatus.error);
      }
      return;
    }

    setIsSubmittingSingle(true);
    setSingleError(null);
    try {
      await onAddNumber(singleStatus.num);
      setSingleInput('');
      if (singleInputRef.current) {
        singleInputRef.current.focus();
      }
    } catch (err: any) {
      setSingleError(err.message || 'Failed to add number');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Parse batch input numbers and ranges
  const parsedBatch = useMemo(() => {
    if (!batchInput.trim()) {
      return { toAdd: [], alreadyCalled: [], invalid: [] };
    }

    const tokens = batchInput
      .replace(/[\n\r,;]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim().toUpperCase().replace(/[BINGO]/g, ''))
      .filter(Boolean);

    const candidates: number[] = [];
    const invalid: string[] = [];

    for (const token of tokens) {
      if (token.includes('-')) {
        const parts = token.split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0], 10);
          const end = parseInt(parts[1], 10);
          if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= 75) {
            for (let i = start; i <= end; i++) {
              candidates.push(i);
            }
            continue;
          }
        }
      }

      const num = parseInt(token, 10);
      if (!isNaN(num) && num >= 1 && num <= 75) {
        candidates.push(num);
      } else {
        invalid.push(token);
      }
    }

    // Deduplicate within candidates while maintaining order
    const seen = new Set<number>();
    const uniqueCandidates: number[] = [];
    for (const n of candidates) {
      if (!seen.has(n)) {
        seen.add(n);
        uniqueCandidates.push(n);
      }
    }

    const toAdd: number[] = [];
    const alreadyCalled: number[] = [];

    for (const n of uniqueCandidates) {
      if (calledSet.has(n)) {
        alreadyCalled.push(n);
      } else {
        toAdd.push(n);
      }
    }

    return { toAdd, alreadyCalled, invalid };
  }, [batchInput, calledSet]);

  // Handle batch submission
  const handleBatchSubmit = async () => {
    if (!activeGame || disabled || isSubmittingBatch) return;
    if (parsedBatch.toAdd.length === 0) return;

    setIsSubmittingBatch(true);
    try {
      await onAddBatchNumbers(parsedBatch.toAdd);
      setBatchInput('');
    } catch (err: any) {
      console.error('Batch add error:', err);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Handle Undo Last Ball
  const handleUndo = async () => {
    if (!activeGame || isUndoing || disabled || activeGame.calledNumbers.length === 0) return;
    setIsUndoing(true);
    try {
      await onUndoLastNumber();
    } catch (err) {
      console.error('Undo error:', err);
    } finally {
      setIsUndoing(false);
    }
  };

  // Color helper for Bingo letters
  const getLetterBadgeStyle = (letter: string) => {
    switch (letter) {
      case 'B':
        return 'bg-blue-600 text-white';
      case 'I':
        return 'bg-rose-600 text-white';
      case 'N':
        return 'bg-amber-500 text-slate-950 font-black';
      case 'G':
        return 'bg-emerald-600 text-white';
      case 'O':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  const lastCalledNumber = activeGame && activeGame.calledNumbers.length > 0
    ? activeGame.calledNumbers[activeGame.calledNumbers.length - 1]
    : null;

  return (
    <div
      className={`border rounded-3xl p-4 sm:p-5 shadow-xl transition-colors space-y-4 ${
        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
              <span>{t('drawNumbersTitle')}</span>
              {activeGame && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                  {activeGame.calledNumbers.length} / 75
                </span>
              )}
            </h3>
            <p className={`text-[11px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAmharic
                ? 'የወጡ ኳሶችን በነጠላ ወይም በጅምላ በማስገባት በጨዋታው ውስጥ ያከማቹ'
                : 'Progressively enter or batch paste drawn numbers into active session'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('progressive');
              setTimeout(() => singleInputRef.current?.focus(), 50);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'progressive'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isNight
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('progressiveEntry')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('batch')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              mode === 'batch'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isNight
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>{t('batchInput')}</span>
          </button>
        </div>
      </div>

      {!activeGame ? (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center py-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('noActiveGameDesc')}
          </p>
        </div>
      ) : (
        <>
          {/* PROGRESSIVE ENTRY TAB */}
          {mode === 'progressive' && (
            <div className="space-y-3">
              <form onSubmit={handleSingleSubmit} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={singleInputRef}
                      type="text"
                      inputMode="numeric"
                      value={singleInput}
                      onChange={(e) => {
                        setSingleInput(e.target.value);
                        setSingleError(null);
                      }}
                      placeholder={t('enterBallNumber')}
                      disabled={disabled || isSubmittingSingle}
                      className={`w-full px-4 py-3 rounded-2xl border font-mono text-base font-bold transition outline-none ${
                        singleStatus && !singleStatus.valid
                          ? 'border-rose-400 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                          : isNight
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                      }`}
                    />

                    {/* Dynamic Letter-Number Preview Pill inside/next to input */}
                    {singleStatus && singleStatus.valid && singleStatus.letter && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black shadow-sm ${getLetterBadgeStyle(
                            singleStatus.letter
                          )}`}
                        >
                          {singleStatus.letter}-{singleStatus.num}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Draw Ball Action Button */}
                  <button
                    type="submit"
                    disabled={
                      disabled ||
                      isSubmittingSingle ||
                      !singleStatus ||
                      !singleStatus.valid ||
                      activeGame.status !== 'IN_PROGRESS' && activeGame.status !== 'PAUSED'
                    }
                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                    <span>{isSubmittingSingle ? '...' : t('drawBallButton')}</span>
                  </button>
                </div>

                {/* Validation or Error Message */}
                {singleError && (
                  <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{singleError}</span>
                  </div>
                )}
                {singleStatus && !singleStatus.valid && !singleError && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{singleStatus.error}</span>
                  </div>
                )}
              </form>

              {/* Progressive Helper / Info footer with Undo */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ⌨️ {isAmharic ? 'ቁጥሩን ጽፈው Enter ይጫኑ' : 'Type ball number and press Enter'}
                </span>

                {/* Undo Button */}
                {lastCalledNumber !== null && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={isUndoing || disabled}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      isNight
                        ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="Remove the most recently called ball"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {t('undoLastBall')} ({getBingoLetter(lastCalledNumber)}-{lastCalledNumber})
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BATCH INPUT TAB */}
          {mode === 'batch' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder={t('batchInputPlaceholder')}
                  disabled={disabled || isSubmittingBatch}
                  className={`w-full p-3 rounded-2xl border font-mono text-xs transition outline-none resize-none ${
                    isNight
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />

                {/* Quick Range Helper shortcuts for fast batch testing */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {t('quickRanges')}:
                  </span>
                  {[
                    { label: '1-10', val: '1-10' },
                    { label: '11-20', val: '11-20' },
                    { label: '21-30', val: '21-30' },
                    { label: '31-45', val: '31-45' },
                    { label: '46-60', val: '46-60' },
                    { label: '61-75', val: '61-75' },
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => {
                        setBatchInput((prev) =>
                          prev.trim() ? `${prev.trim()}, ${r.val}` : r.val
                        );
                      }}
                      className={`px-2 py-0.5 rounded-lg border font-mono font-bold transition cursor-pointer ${
                        isNight
                          ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      +{r.label}
                    </button>
                  ))}
                  {batchInput && (
                    <button
                      type="button"
                      onClick={() => setBatchInput('')}
                      className="text-rose-500 hover:text-rose-400 ml-auto font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t('clearAll')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Parsed Preview Chips */}
              {batchInput.trim() && (
                <div
                  className={`p-3 rounded-2xl border space-y-2 ${
                    isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {t('readyToAddBatch')}: {parsedBatch.toAdd.length}
                      </span>
                    </span>

                    {parsedBatch.alreadyCalled.length > 0 && (
                      <span className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
                        ({parsedBatch.alreadyCalled.length} {t('numberAlreadyCalled')})
                      </span>
                    )}
                  </div>

                  {/* Balls Chips Preview */}
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                    {parsedBatch.toAdd.map((num) => {
                      const letter = getBingoLetter(num);
                      return (
                        <span
                          key={num}
                          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold shadow-xs ${getLetterBadgeStyle(
                            letter
                          )}`}
                        >
                          {letter}-{num}
                        </span>
                      );
                    })}

                    {parsedBatch.alreadyCalled.map((num) => (
                      <span
                        key={`called-${num}`}
                        className="px-2 py-0.5 rounded-lg text-xs font-mono font-medium line-through opacity-40 bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                        title={t('numberAlreadyCalled')}
                      >
                        {num}
                      </span>
                    ))}
                  </div>

                  {parsedBatch.toAdd.length === 0 && parsedBatch.alreadyCalled.length > 0 && (
                    <p className="text-xs text-amber-500 dark:text-amber-400 italic">
                      {t('allBatchAlreadyCalled')}
                    </p>
                  )}
                </div>
              )}

              {/* Add Batch Button & Undo */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleBatchSubmit}
                  disabled={
                    disabled ||
                    isSubmittingBatch ||
                    parsedBatch.toAdd.length === 0 ||
                    activeGame.status !== 'IN_PROGRESS' && activeGame.status !== 'PAUSED'
                  }
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isSubmittingBatch
                      ? '...'
                      : `${t('addBatchToSession')} (${parsedBatch.toAdd.length})`}
                  </span>
                </button>

                {lastCalledNumber !== null && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={isUndoing || disabled}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      isNight
                        ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('undoLastBall')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
