import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { FixedCardView } from './FixedCardView';
import { VerificationResult, BingoCard } from '../types/bingo';
import { WinnerOverlayData } from './BingoWinnerOverlay';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  speakVerificationOutcome,
  VerificationOutcome,
} from '../utils/winnerVoice';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  AlertTriangle,
  Sparkles,
  X,
  Coins,
  PartyPopper,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface WinnerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  calledNumbers: number[];
  agentId: string;
  onWinnerConfirmed: (
    cardId: string,
    pattern: string,
    prizeAmount?: number,
    extraData?: Partial<WinnerOverlayData>
  ) => void;
  onWinnerVerified?: (data: WinnerOverlayData) => void;
  isAfterGameCheck?: boolean;
  capturedNumbers?: number[];
  capturedCards?: string[];
  initialCardId?: string;
  autoSoundCheck?: boolean;
}

export const WinnerVerificationModal: React.FC<WinnerVerificationModalProps> = ({
  isOpen,
  onClose,
  gameId,
  calledNumbers,
  agentId,
  onWinnerConfirmed,
  onWinnerVerified,
  isAfterGameCheck = false,
  capturedNumbers,
  capturedCards,
  initialCardId = '',
  autoSoundCheck = false,
}) => {
  const { t, isAmharic, language } = useLanguage();
  const { isNight } = useTheme();

  const [cardIdInput, setCardIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prizeAmount, setPrizeAmount] = useState<string>('500');
  const [prizeNotes, setPrizeNotes] = useState<string>('Village Winner Prize');
  const [isSubmittingWinner, setIsSubmittingWinner] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const startingId = initialCardId || '';
      setCardIdInput(startingId);
      setVerification(null);
      setCard(null);
      setError(null);

      if (startingId && autoSoundCheck) {
        handleVerify(startingId, true);
      }
    }
  }, [isOpen, initialCardId, autoSoundCheck]);

  if (!isOpen) return null;

  // Normalize card ID input (e.g. "12" -> "CARD-0012", "CARD-5" -> "CARD-0005")
  const normalizeCardId = (input: string): string => {
    const raw = input.trim().toUpperCase();
    if (!raw) return '';
    if (/^\d+$/.test(raw)) {
      const padded = raw.padStart(4, '0');
      return `CARD-${padded}`;
    }
    if (raw.startsWith('CARD-')) {
      const numPart = raw.replace('CARD-', '');
      if (/^\d+$/.test(numPart)) {
        return `CARD-${numPart.padStart(4, '0')}`;
      }
    }
    return raw;
  };

  const handleVerify = async (idToVerify?: string, triggerSound = false) => {
    const raw = idToVerify || cardIdInput;
    const targetId = normalizeCardId(raw);
    if (!targetId) {
      setError(isAmharic ? 'እባክዎ የካርድ ቁጥር ያስገቡ (ለምሳሌ 12 ወይም CARD-0012)' : 'Please enter a Card Number (e.g. 12 or CARD-0012)');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setVerification(null);
    setCard(null);

    try {
      const res = await api.verifyCardInGame(gameId, targetId, calledNumbers);
      if (!res.success) {
        setError(res.error || (isAmharic ? 'ካርዱን ማረጋገጥ አልተቻለም' : 'Card not found or could not be verified'));
        if (soundEnabled || triggerSound) {
          speakVerificationOutcome('NOT_WINNER', isAmharic);
        }
      } else {
        setVerification(res.verification);
        setCard(res.card);

        const outcome: VerificationOutcome = !res.verification.isValid
          ? 'NOT_WINNER'
          : res.verification.isLate
          ? 'LATE'
          : 'WINNER';

        // If it's an on-time winner, trigger celebration confetti
        if (outcome === 'WINNER') {
          confetti({
            particleCount: 110,
            spread: 75,
            origin: { y: 0.6 },
          });
        }

        // Voice announcement ("This is winner", "This is a late", "This is not winner")
        if (soundEnabled || triggerSound) {
          speakVerificationOutcome(outcome, isAmharic);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with database');
      if (soundEnabled || triggerSound) {
        speakVerificationOutcome('NOT_WINNER', isAmharic);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmWinner = async () => {
    if (!verification || !verification.isValid || !card) return;

    setIsSubmittingWinner(true);
    try {
      const primaryPattern = verification.winningPatterns[0]?.patternName || 'Valid Bingo Line';
      await api.recordGameWinner(gameId, {
        cardId: card.cardId,
        agentId,
        pattern: primaryPattern,
        matchedNumbers: verification.matchedNumbers,
        prizeAmount: prizeAmount ? Number(prizeAmount) : undefined,
        prizeNotes,
      });

      onWinnerConfirmed(
        card.cardId,
        primaryPattern,
        prizeAmount ? Number(prizeAmount) : undefined,
        {
          card,
          winningIndices: verification.winningPatterns.flatMap((p) => p.winningIndices),
          matchedNumbers: verification.matchedNumbers,
          totalMatched: verification.totalMatched,
          prize: prizeAmount ? Number(prizeAmount) : undefined,
          prizeNotes,
          gameId,
          calledNumbers,
        }
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record winner');
    } finally {
      setIsSubmittingWinner(false);
    }
  };

  const latestBall = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 flex items-center justify-center min-h-screen animate-fadeIn">
      <div
        className={`border rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
          isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                {isAfterGameCheck
                  ? (isAmharic ? 'ከጨዋታ በኋላ የካርድ ቁጥር ማረጋገጫ' : 'After-Game Card Checker')
                  : (isAmharic ? 'የቢንጎ አሸናፊ ማረጋገጫ (ጨዋታው ቆሟል)' : 'Bingo Winner Verification (Game Paused)')}
              </h3>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAmharic ? 'የጨዋታ መለያ:' : 'Game Session:'}{' '}
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{gameId}</span>{' '}
                ({calledNumbers.length} {isAmharic ? 'የተጠሩ ኳሶች' : 'balls called'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                soundEnabled
                  ? isNight
                    ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : isNight
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-slate-100 border-slate-300 text-slate-500'
              }`}
              title={soundEnabled ? 'Voice Announcement ON' : 'Voice Announcement Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? t('soundCheckActive') : 'Muted'}</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 pt-4 space-y-4">
          {/* Card Number Input */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
              {isAmharic ? 'የተጫዋቹን የካርድ ቁጥር ያስገቡ:' : 'Insert Gamer / Player Card Number:'}
            </label>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={cardIdInput}
                  onChange={(e) => setCardIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerify(undefined, true);
                  }}
                  placeholder={isAmharic ? 'ለምሳሌ 12 ወይም CARD-0012' : 'e.g. 12, 5, or CARD-0012'}
                  className={`w-full border rounded-2xl px-4 py-3 pl-10 font-mono text-sm tracking-wider uppercase transition outline-none ${
                    isNight
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
                  }`}
                  autoFocus
                />
                <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${isNight ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>

              <button
                type="button"
                onClick={() => handleVerify(undefined, false)}
                disabled={isVerifying}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{isAmharic ? 'ፈትሽ' : 'Check Card'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleVerify(undefined, true)}
                disabled={isVerifying}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                title='Check Card and Announce Voice: "This is winner", "This is a late", or "This is not winner"'
              >
                <Volume2 className="w-4 h-4 text-slate-950" />
                <span>{t('soundCheck')}</span>
              </button>
            </div>

            {/* Captured Cards for this Game */}
            {((capturedNumbers && capturedNumbers.length > 0) || (capturedCards && capturedCards.length > 0)) ? (
              <div className="mt-2.5 p-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 dark:bg-emerald-950/30 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span>{isAmharic ? 'ለዚህ ዙር የተያዙ ካርዶች (ቀጥታ ለመፈተሽ ይጫኑ):' : 'Captured Cards in this Round (Click to Check):'}</span>
                  <span className="font-mono">{capturedNumbers?.length || capturedCards?.length} {isAmharic ? 'ካርዶች' : 'cards'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto">
                  {(capturedNumbers || []).map((num) => {
                    const cardId = `CARD-${String(num).padStart(4, '0')}`;
                    const isSelected = card?.cardId === cardId || cardIdInput === cardId || cardIdInput === String(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setCardIdInput(String(num));
                          handleVerify(String(num));
                        }}
                        className={`px-2 py-1 rounded-xl font-mono text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : isNight
                            ? 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500 hover:text-emerald-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-600'
                        }`}
                      >
                        <span>#{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-2xl bg-slate-50 border border-slate-300 text-slate-700 text-xs flex items-center gap-2">
                <span>{isAmharic ? 'ምሳሌ ካርዶች:' : 'Enter card number:'}</span>
              </div>
            )}
          </div>

          {/* Uncaptured Warning if card checked was not in the round's captured numbers */}
          {card && capturedCards && capturedCards.length > 0 && !capturedCards.includes(card.cardId) && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{t('notInCapturedWarning')} ({card.cardId})</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Verification Results Display */}
          {verification && card && (
            <div className="space-y-4 pt-1">
              {/* ========================================================================= */}
              {/* 1. OUTCOME A: WINNER (Timely call on the winning ball)                   */}
              {/* ========================================================================= */}
              {verification.isValid && !verification.isLate && (
                <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-xl space-y-3 animate-fadeIn">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider shadow">
                            {t('winner')}
                          </span>
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            {t('congratulations')}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-1">
                          {isAmharic ? 'ትክክለኛ አሸናፊ ካርድ!' : 'Official Winner Card!'}
                        </h4>
                        <p className="text-xs opacity-90 mt-0.5">
                          {isAmharic ? 'የተገኘ መስመር:' : 'Winning Pattern:'}{' '}
                          <strong>{verification.winningPatterns.map((p) => p.patternName).join(', ')}</strong>
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700">
                      {verification.totalMatched}/24 {isAmharic ? 'የተጠሩ' : 'Matched'}
                    </span>
                  </div>

                  {/* Winner Action Buttons Pop-up */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <button
                      type="button"
                      onClick={() => {
                        const primaryPattern = verification.winningPatterns[0]?.patternName || 'Valid Bingo Line';
                        onWinnerVerified?.({
                          cardId: card.cardId,
                          card,
                          pattern: primaryPattern,
                          winningIndices: verification.winningPatterns.flatMap((p) => p.winningIndices),
                          matchedNumbers: verification.matchedNumbers,
                          totalMatched: verification.totalMatched,
                          prize: prizeAmount ? Number(prizeAmount) : undefined,
                          prizeNotes,
                          gameId,
                          calledNumbers,
                        });
                        onClose();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      <PartyPopper className="w-4 h-4" />
                      <span>{t('showRoomCelebration')} 🎉</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmWinner}
                      disabled={isSubmittingWinner}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isSubmittingWinner ? 'Recording...' : (isAmharic ? 'አሸናፊነቱን መዝግብና ጨዋታውን ጨርስ' : 'Confirm Winner & End Game')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 2. OUTCOME B: LATE WINNER ("It's late.")                                   */}
              {/* ========================================================================= */}
              {verification.isValid && verification.isLate && (
                <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xl space-y-3 animate-fadeIn">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Clock className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow">
                            {t('itsLate')}
                          </span>
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            {isAmharic ? 'ዘግይቶ የተጠራ ቢንጎ' : 'Late Bingo Claim'}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-1">
                          {t('itsLate')}
                        </h4>
                        <p className="text-xs opacity-90 mt-0.5">
                          {t('itsLateDetail')}
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700">
                      {isAmharic ? 'የቀደመ መስመር' : 'Earlier Line'}
                    </span>
                  </div>

                  {/* Late Winner Actions Pop-up */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{isAmharic ? 'እንደ ዘገየ መዝግብና ጨዋታውን ቀጥል' : "It's late. (Reject & Resume Game)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmWinner}
                      disabled={isSubmittingWinner}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition cursor-pointer"
                    >
                      <span>{isAmharic ? 'ለየት ባለ ሁኔታ አሸናፊነቱን ተቀበል' : 'Accept Winner Anyway (Operator Override)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 3. OUTCOME C: NOT A WINNER ("This number is not winner")                   */}
              {/* ========================================================================= */}
              {!verification.isValid && (
                <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-950 dark:text-rose-100 shadow-xl space-y-3 animate-fadeIn">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
                        <XCircle className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow">
                            {t('thisNumberNotWinner')}
                          </span>
                        </div>
                        <h4 className="text-xl font-black mt-1">
                          {t('thisNumberNotWinner')}
                        </h4>
                        <p className="text-xs opacity-90 mt-0.5">
                          {isAmharic
                            ? `የተጣጣሙ ቁጥሮች: ${verification.totalMatched}/24። የተሟላ የቢንጎ መስመር አልተገኘም።`
                            : `Matched ${verification.totalMatched} numbers. No complete winning line formed yet.`}
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700">
                      {verification.totalMatched}/24 {isAmharic ? 'የተጠሩ' : 'Matched'}
                    </span>
                  </div>

                  {/* Not a winner Action */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200 dark:border-rose-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{isAmharic ? 'ይህ ቁጥር አሸናፊ አይደለም - ጨዋታውን ቀጥል' : 'This number is not winner (Resume Game)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Side-by-side Inspection: 5x5 Card Matrix & Call Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isAmharic ? 'የካርድ ቁጥሮች ምርመራ:' : 'Physical Card Layout & Hit Inspection:'}
                  </div>
                  <FixedCardView
                    card={card}
                    calledNumbers={calledNumbers}
                    winningIndices={verification.winningPatterns.flatMap((p) => p.winningIndices)}
                  />
                </div>

                {/* Match Breakdowns */}
                <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
                  isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className={`block font-semibold mb-1 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isAmharic ? 'በጨዋታው ውስጥ የተጠሩ የካርዱ ቁጥሮች:' : 'Matched Numbers in This Game:'}
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {verification.matchedNumbers.length > 0 ? (
                        verification.matchedNumbers.map((n) => (
                          <span
                            key={n}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs shadow-xs"
                          >
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">{isAmharic ? 'ምንም ቁጥር አልተጠራም' : 'No numbers called on this card'}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className={`block font-semibold mb-1 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isAmharic ? 'ያልተጠሩ የካርዱ ቁጥሮች:' : 'Uncalled Numbers:'}
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {verification.unmatchedNumbers.map((n) => (
                        <span
                          key={n}
                          className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
                            isNight ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Prize Details if Valid */}
                  {verification.isValid && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <div>
                        <label className={`block font-semibold mb-1 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                          {isAmharic ? 'የሽልማት መጠን:' : 'Prize Amount:'}
                        </label>
                        <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${
                          isNight ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                        }`}>
                          <Coins className="w-4 h-4 text-amber-500" />
                          <input
                            type="number"
                            value={prizeAmount}
                            onChange={(e) => setPrizeAmount(e.target.value)}
                            className="bg-transparent font-mono font-bold w-full outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
