import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Play,
  X,
  Coins,
  Plus,
  Trash2,
  Check,
  Grid,
  Hash,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';

interface StartGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: (gamerCount: number, capturedNumbers: number[], capturedCards: string[]) => void;
  agentBalance: number;
  gameCost?: number;
  isStarting?: boolean;
}

export const StartGameModal: React.FC<StartGameModalProps> = ({
  isOpen,
  onClose,
  onConfirmStart,
  agentBalance,
  gameCost = 50,
  isStarting = false,
}) => {
  const { t, isAmharic } = useLanguage();
  const { isNight } = useTheme();

  // Mode: 'FAST_ENTRY' or 'GRID_SELECT'
  const [entryMode, setEntryMode] = useState<'FAST_ENTRY' | 'GRID_SELECT'>('GRID_SELECT');
  // Starts empty - card numbers held by players MUST be entered before start!
  const [capturedNumbers, setCapturedNumbers] = useState<number[]>([]);
  const [numberInput, setNumberInput] = useState<string>('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Reset to empty whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setCapturedNumbers([]);
      setNumberInput('');
      setInputError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Presets of card ranges
  const rangePresets = [
    { label: 'Cards 1-5', range: [1, 5] },
    { label: 'Cards 1-10', range: [1, 10] },
    { label: 'Cards 1-15', range: [1, 15] },
    { label: 'Cards 1-20', range: [1, 20] },
    { label: 'Cards 1-30', range: [1, 30] },
    { label: 'Cards 1-50', range: [1, 50] },
  ];

  // Helper to parse input like "1, 2, 5, 10-15, 22"
  const parseNumbersInput = (raw: string): number[] => {
    const result: number[] = [];
    // Split by commas, spaces, or semicolons
    const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);

    for (const token of tokens) {
      // Check for range like "1-10" or "CARD-1 to CARD-10"
      const cleanToken = token.toUpperCase().replace(/CARD-/g, '');
      if (cleanToken.includes('-')) {
        const [startStr, endStr] = cleanToken.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          const clampedEnd = Math.min(end, 75);
          for (let i = start; i <= clampedEnd; i++) {
            result.push(i);
          }
        }
      } else {
        const num = parseInt(cleanToken, 10);
        if (!isNaN(num) && num > 0 && num <= 75) {
          result.push(num);
        }
      }
    }
    return result;
  };

  const handleAddNumbers = () => {
    setInputError(null);
    if (!numberInput.trim()) return;

    const parsed = parseNumbersInput(numberInput);
    if (parsed.length === 0) {
      setInputError(isAmharic ? 'እባክዎ ትክክለኛ የካርድ ቁጥር ያስገቡ (ለምሳሌ 5, 12 ወይም 1-10)' : 'Please enter valid card numbers (e.g. 5, 12 or 1-10)');
      return;
    }

    // Merge uniquely and sort
    const set = new Set([...capturedNumbers, ...parsed]);
    const sorted = Array.from(set).sort((a, b) => a - b);
    setCapturedNumbers(sorted);
    setNumberInput('');
  };

  const handleApplyPreset = (start: number, end: number) => {
    const nums: number[] = [];
    for (let i = start; i <= end; i++) {
      nums.push(i);
    }
    setCapturedNumbers(nums);
    setInputError(null);
  };

  const handleToggleCardNumber = (num: number) => {
    if (capturedNumbers.includes(num)) {
      setCapturedNumbers(capturedNumbers.filter((n) => n !== num));
    } else {
      setCapturedNumbers([...capturedNumbers, num].sort((a, b) => a - b));
    }
  };

  const handleRemoveNumber = (num: number) => {
    setCapturedNumbers(capturedNumbers.filter((n) => n !== num));
  };

  const handleClearAll = () => {
    setCapturedNumbers([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (capturedNumbers.length === 0) {
      setInputError(isAmharic ? 'እባክዎ ቢያንስ አንድ የተያዘ የካርድ ቁጥር ያስገቡ' : 'Please insert at least one captured card number before starting');
      return;
    }

    const gamerCount = capturedNumbers.length;
    const capturedCards = capturedNumbers.map((n) => `CARD-${String(n).padStart(4, '0')}`);
    onConfirmStart(gamerCount, capturedNumbers, capturedCards);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center min-h-screen animate-fadeIn">
      <div
        className={`border rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative transition-all my-auto max-h-[92vh] flex flex-col overflow-hidden ${
          isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {t('insertCapturedNumbers')}
              </h3>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAmharic
                  ? 'ጨዋታው ከመጀመሩ በፊት በተጫዋቾች የተያዙትን ቋሚ ካርዶች ቁጥር ያስገቡ'
                  : 'Register the physical card numbers taken by players for this round'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher: Fast Input vs Interactive Grid */}
        <div className="flex items-center justify-between gap-2 pt-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEntryMode('FAST_ENTRY')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                entryMode === 'FAST_ENTRY'
                  ? 'bg-emerald-600 text-white shadow font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{isAmharic ? 'ፈጣን ጽሑፍ' : 'Fast Input'}</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('GRID_SELECT')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                entryMode === 'GRID_SELECT'
                  ? 'bg-emerald-600 text-white shadow font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{isAmharic ? 'የካርዶች ምርጫ ሰሌዳ' : 'Cards Grid'}</span>
            </button>
          </div>

          {/* Captured count pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
              {capturedNumbers.length} {t('capturedCardsCount')}
            </span>
            {capturedNumbers.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                title={t('clearAll')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('clearAll')}</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 pr-1 pt-3 space-y-4">
          {/* Mandatory requirement notice */}
          {capturedNumbers.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 border-opacity-80 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <div>
              
                <span>{t('mustInsertHeldCardsWarning')}</span>
              </div>
            </div>
          )}

          {/* Mode 1: Fast Entry Input */}
          {entryMode === 'FAST_ENTRY' && (
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                {isAmharic ? 'የተያዙ የካርድ ቁጥሮችን ያስገቡ (በነጠላ ሰረዝ ወይም ክልል 1-10):' : 'Enter Card Numbers (comma, space, or range 1-10):'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNumbers();
                    }
                  }}
                  placeholder={t('enterCardNumbersPlaceholder')}
                  className={`flex-1 border rounded-2xl px-4 py-2.5 font-mono text-xs sm:text-sm tracking-wide transition outline-none ${
                    isNight
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNumbers}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('addCards')}</span>
                </button>
              </div>
              <p className={`text-[11px] mt-1 ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isAmharic
                  ? 'ምሳሌ፡ 5, 12, 18, 23 ወይም 1-20 (የተጫዋቾቹን የካርድ ቁጥሮች በአንድ ላይ ያስገቡ)'
                  : 'Examples: "5, 12, 18" or "1-20" or "CARD-0005, CARD-0012"'}
              </p>
            </div>
          )}

          {/* Mode 2: Interactive Grid Select (1 to 50) */}
          {entryMode === 'GRID_SELECT' && (
            <div>
              <span className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                {isAmharic ? 'የተያዙ ካርዶችን ለመምረጥ/ለመሰረዝ ይጫኑ:' : 'Click cards to capture / uncapture:'}
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto p-1 border rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((n) => {
                  const isCaptured = capturedNumbers.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleToggleCardNumber(n)}
                      className={`h-9 rounded-xl font-mono text-xs font-bold border transition flex items-center justify-center cursor-pointer ${
                        isCaptured
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                          : isNight
                          ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {inputError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {inputError}
            </div>
          )}

          {/* Captured Numbers Display List / Badges */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isNight ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('inPlayCards')} ({capturedNumbers.length})</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {isAmharic ? 'የተጫዋቾች ብዛት' : 'Gamer Count'}: {capturedNumbers.length}
              </span>
            </div>

            {capturedNumbers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                {capturedNumbers.map((num) => (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-mono font-bold text-xs shadow-xs"
                  >
                    <span>#{num}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNumber(num)}
                      className="hover:bg-emerald-700 rounded-full p-0.5 transition cursor-pointer"
                      title={`Remove Card #${num}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-amber-600 dark:text-amber-400/90 font-medium">
                {isAmharic
                  ? '⚠️ እስካሁን ምንም የተያዘ ካርድ አልገባም! እባክዎ ከላይ ያሉትን ክልሎች በመጫን ወይም ቁጥሮችን በመተየብ የተጫዋቾቹን ካርዶች ይመዝግቡ።'
                  : '⚠️ No held card numbers registered yet. You must insert card numbers or select a preset before starting.'}
              </div>
            )}
          </div>

          {/* Session Cost & Balance Overview */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{isAmharic ? 'የጨዋታ ክፍያ:' : 'Game Cost:'} <strong className="text-rose-500 font-mono font-bold">-{gameCost} CR</strong></span>
            </div>
            <div>
              <span>{isAmharic ? 'የጣቢያ ቀሪ ሂሳብ:' : 'Available:'} <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{agentBalance} CR</strong></span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={isStarting || capturedNumbers.length === 0}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {isStarting
                  ? t('startingGame')
                  : capturedNumbers.length === 0
                  ? t('insertCardsFirst')
                  : `${t('startBingoGame')} (${capturedNumbers.length} ${t('capturedCardsCount')})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
