import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { BingoCard } from '../types/bingo';
import { FixedCardView } from './FixedCardView';
import { getBingoLetter } from '../utils/bingoEngine';
import { useLanguage } from '../context/LanguageContext';
import { translatePattern } from '../i18n/translations';
import {
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Coins,
  CheckCircle2,
  Flame,
  Award,
  PartyPopper,
  RotateCcw,
  Check,
} from 'lucide-react';

export interface WinnerOverlayData {
  cardId: string;
  card?: BingoCard | null;
  pattern: string;
  winningIndices?: [number, number][];
  matchedNumbers?: number[];
  totalMatched?: number;
  prize?: number;
  prizeNotes?: string;
  gameId?: string;
  calledNumbers?: number[];
}

interface BingoWinnerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  winner: WinnerOverlayData | null;
  onConfirmEndGame?: () => void;
  voiceEnabled?: boolean;
}

/**
 * High-energy Web Audio Fanfare synthesizer (100% offline, zero external dependencies).
 * Produces a bright, rich brass-style chord arpeggio with celebratory chime release.
 */
function playFanfareTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Triumphant fanfare notes: C5 -> E5 -> G5 -> C6 -> G5 -> C6 (sustain) + E6 harmony
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.16 }, // C5
      { freq: 659.25, time: 0.15, dur: 0.16 }, // E5
      { freq: 783.99, time: 0.30, dur: 0.16 }, // G5
      { freq: 1046.5, time: 0.45, dur: 0.55 }, // C6
      { freq: 783.99, time: 0.95, dur: 0.16 }, // G5
      { freq: 1046.5, time: 1.10, dur: 1.4 }, // C6 Grand finish
      { freq: 1318.51, time: 1.10, dur: 1.4 }, // E6 Major third harmony
      { freq: 1567.98, time: 1.15, dur: 1.35 }, // G6 Sparkle overtone
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Warm brass/synth chime timbre
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      // Smooth attack & rich exponential decay
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + time + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.05);
    });
  } catch (err) {
    console.warn('Web Audio fanfare error:', err);
  }
}

/**
 * Multi-stage room celebration confetti cannons
 */
export function fireRoomConfetti() {
  try {
    // Stage 1: Central gold & emerald blast
    confetti({
      particleCount: 85,
      spread: 100,
      origin: { y: 0.55 },
      colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'],
    });

    // Stage 2: Left cannon
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff'],
      });
    }, 180);

    // Stage 3: Right cannon
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.65 },
        colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#fbbf24'],
      });
    }, 360);

    // Stage 4: Starburst shower
    setTimeout(() => {
      confetti({
        particleCount: 45,
        spread: 90,
        origin: { y: 0.35 },
        shapes: ['star'],
        colors: ['#fef08a', '#fbbf24', '#f59e0b'],
      });
    }, 600);
  } catch (e) {
    console.warn('Confetti burst error:', e);
  }
}

export const BingoWinnerOverlay: React.FC<BingoWinnerOverlayProps> = ({
  isOpen,
  onClose,
  winner,
  onConfirmEndGame,
  voiceEnabled = true,
}) => {
  const { t, language, isAmharic } = useLanguage();
  const [audioMuted, setAudioMuted] = useState(false);

  // Trigger celebration effects on open
  useEffect(() => {
    if (!isOpen || !winner) return;

    // Confetti cannon
    fireRoomConfetti();

    // Sound fanfare
    if (!audioMuted) {
      playFanfareTone();
    }

    // Voice announcement
    if (voiceEnabled && !audioMuted && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const patternText = isAmharic
          ? translatePattern(winner.pattern, 'am')
          : (winner.pattern || 'Valid Bingo Line');

        const message = isAmharic
          ? `ቢንጎ! ትኩረት ለሁላችሁም! ይፋዊ አሸናፊ ተረጋግጧል! ካርድ ${winner.cardId}፣ ${patternText} አጠናቋል! እንኳን ደስ አላችሁ!`
          : `Bingo! Attention everyone! We have an official verified winner! Card ${winner.cardId} has completed ${patternText}! Congratulations!`;

        const utterance = new SpeechSynthesisUtterance(message);
        if (isAmharic) {
          utterance.lang = 'am-ET';
        }
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }

    // Keyboard escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, winner, audioMuted, voiceEnabled, isAmharic]);

  const handleManualConfetti = useCallback(() => {
    fireRoomConfetti();
    if (!audioMuted) {
      playFanfareTone();
    }
  }, [audioMuted]);

  if (!isOpen || !winner) return null;

  // Form winning numbers with their letter prefix
  const winningNumbersWithLetters = (winner.matchedNumbers || []).map((num) => ({
    num,
    letter: getBingoLetter(num),
  }));

  const translatedPattern = translatePattern(winner.pattern, language);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center min-h-screen">
        {/* Ambient Radial Spotlight Rays */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="w-[900px] h-[900px] opacity-20 bg-[conic-gradient(from_0deg_at_50%_50%,#f59e0b_0deg,transparent_45deg,#10b981_90deg,transparent_135deg,#f59e0b_180deg,transparent_225deg,#ec4899_270deg,transparent_315deg,#f59e0b_360deg)] rounded-full blur-2xl"
          />
          <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="relative w-full max-w-4xl bg-slate-900/95 border-2 border-amber-500/60 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.35)] overflow-hidden my-auto max-h-[92vh] flex flex-col z-10"
        >
          {/* Top Golden Light Strip */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-yellow-300 via-emerald-400 to-rose-500 shrink-0 animate-pulse" />

          {/* Header Action Bar */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                {t('officialVerification')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAudioMuted(!audioMuted)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  audioMuted
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
                title={audioMuted ? 'Audio Fanfare Muted' : 'Audio Fanfare Active'}
              >
                {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{audioMuted ? t('muted') : t('fanfare')}</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition"
                title="Close celebration overlay (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
            {/* Grand Banner Headline */}
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, times: [0, 0.7, 1] }}
                className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.6)] mb-2"
              >
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-1"
              >
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-black tracking-widest uppercase">
                  {t('bingoBadge')}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] uppercase">
                  {t('weHaveAWinner')}
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
                  {t('winnerVerifiedDesc')}
                </p>
              </motion.div>
            </div>

            {/* Winner Showcase Card */}
            <div className="bg-gradient-to-b from-slate-800/80 to-slate-950/90 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left Side: Card ID & Verified Pattern */}
                <div className="space-y-4 text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('officialPrintedCard')}</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                      {t('winningCardId')}
                    </span>
                    <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                      {winner.cardId}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                      {t('winningPattern')}
                    </span>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-bold text-sm sm:text-base">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>{translatedPattern}</span>
                    </div>
                  </div>

                  {/* Prize Badge if awarded */}
                  {winner.prize ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                        <Coins className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-black text-amber-300">
                          {winner.prize} CR {t('prizePool')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {winner.prizeNotes || t('grandPrize')}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Right Side: Mini 5x5 Matrix Preview */}
                {winner.card && (
                  <div className="w-full md:w-auto flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
                      {t('gridInspection')}
                    </span>
                    <div className="max-w-[260px] w-full transform hover:scale-105 transition-transform duration-200">
                      <FixedCardView
                        card={winner.card}
                        calledNumbers={winner.calledNumbers || []}
                        winningIndices={winner.winningIndices || []}
                        compact
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Matched Numbers Ticker */}
              {winningNumbersWithLetters.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold mb-2 flex items-center justify-between">
                    <span>{t('matchedNumbersTitle')}</span>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      {winner.totalMatched || winningNumbersWithLetters.length} {t('numbersMatched')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {winningNumbersWithLetters.map(({ num, letter }) => (
                      <span
                        key={num}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <span className="text-amber-400 font-black">{letter}</span>
                        <span>{num}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Room Crowd Interaction Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleManualConfetti}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(245,158,11,0.4)] transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                <PartyPopper className="w-5 h-5" />
                <span>{t('fireConfetti')}</span>
              </button>

              <button
                onClick={() => {
                  playFanfareTone();
                }}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-sm border border-slate-700 transition flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>{t('replayFanfare')}</span>
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-400">
              {t('gameId')}:{' '}
              <span className="font-mono text-slate-200">
                {winner.gameId || 'Current In-Progress'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
              >
                {t('returnToBoard')}
              </button>

              {onConfirmEndGame && (
                <button
                  onClick={() => {
                    onConfirmEndGame();
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('concludeAndEnd')}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
