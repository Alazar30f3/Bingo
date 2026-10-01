import React, { useState, useEffect, useRef } from 'react';
import { Game, BingoCard, Agent, VerificationResult } from '../types/bingo';
import { api } from '../services/api';
import { getBingoLetter } from '../utils/bingoEngine';
import { playVerificationAudioTone, speakVerificationOutcome } from '../utils/winnerVoice';
import { isVoiceEnabled, setVoiceEnabled as setGlobalVoiceEnabled } from '../utils/bingoAudio';
import { WinnerVerificationModal } from './WinnerVerificationModal';
import { BingoWinnerOverlay, WinnerOverlayData } from './BingoWinnerOverlay';
import { StartGameModal } from './StartGameModal';
import { DrawnNumbersEntryForm } from './DrawnNumbersEntryForm';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { translatePattern, getAmharicLetterPhonetic } from '../i18n/translations';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Maximize2,
  Radio,
  Coins,
  Search,
  PartyPopper,
  Users,
  SearchCheck,
  Timer,
  Minus,
  Plus,
} from 'lucide-react';

interface CallerViewProps {
  currentAgent: Agent | null;
  onRefreshAgent: () => void;
  onOpenPdfModal?: () => void;
}

export const CallerView: React.FC<CallerViewProps> = ({
  currentAgent,
  onRefreshAgent,
}) => {
  const { t, language, isAmharic } = useLanguage();
  const { isNight } = useTheme();

  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [latestCompletedGame, setLatestCompletedGame] = useState<Game | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isAutoCalling, setIsAutoCalling] = useState<boolean>(false);
  const [autoIntervalSec, setAutoIntervalSec] = useState<number>(2);
  const [secondsUntilNextCall, setSecondsUntilNextCall] = useState<number>(2);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => isVoiceEnabled());

  // Modals
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState<boolean>(false);
  const [isAfterGameCheckOpen, setIsAfterGameCheckOpen] = useState<boolean>(false);
  const [isStartingGame, setIsStartingGame] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Winner Celebration Overlays
  const [winnerNotice, setWinnerNotice] = useState<{ cardId: string; pattern: string; prize?: number } | null>(null);
  const [winnerOverlayData, setWinnerOverlayData] = useState<WinnerOverlayData | null>(null);
  const [isWinnerOverlayOpen, setIsWinnerOverlayOpen] = useState<boolean>(false);

  const autoCallTimerRef = useRef<any>(null);
  const activeGameRef = useRef<Game | null>(activeGame);
  activeGameRef.current = activeGame;
  const isCallingNextRef = useRef<boolean>(false);
  const gameStartPlayedGameIdRef = useRef<string | null>(null);
  const winnerVoicePlayedCardIdRef = useRef<string | null>(null);

  // Load active game or latest in-progress game on mount
  useEffect(() => {
    loadGames();
  }, [currentAgent]);

  const loadGames = async () => {
    try {
      const res = await api.getGames(currentAgent?.agentId);
      if (res.success && res.games.length > 0) {
        const inProgress = res.games.find((g) => g.status === 'IN_PROGRESS' || g.status === 'PAUSED');
        if (inProgress) {
          setActiveGame(inProgress);
          if (inProgress.calledNumbers.length > 0) {
            setCurrentNumber(inProgress.calledNumbers[inProgress.calledNumbers.length - 1]);
          }
        } else {
          setActiveGame(null);
        }

        const completed = res.games.find((g) => g.status === 'COMPLETED');
        if (completed) {
          setLatestCompletedGame(completed);
        }
      }
    } catch (e) {
      console.error('Error loading games:', e);
    }
  };

  // Reliable recorded-number playback.
  // We keep playback inside CallerView so a broken TTS/audio-cache implementation
  // cannot prevent the caller from announcing the selected number.
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRequestIdRef = useRef(0);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());

  const stopCurrentAudio = () => {
    const audio = currentAudioRef.current;
    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    } catch (err) {
      console.warn('Could not stop current Bingo audio:', err);
    }

    currentAudioRef.current = null;
  };

  const buildAudioUrl = (fileName: string) => {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}audio/bingo/${encodeURIComponent(fileName)}`;
  };

  const playRecordedFile = async (fileName: string) => {
    if (!voiceEnabled) return;

    const requestId = ++audioRequestIdRef.current;
    stopCurrentAudio();

    const originalExtension = fileName.toLowerCase().endsWith('.aac')
      ? '.aac'
      : fileName.toLowerCase().endsWith('.mp3')
        ? '.mp3'
        : '';

    // Try the recorded AAC first, then MP3 if the device/browser cannot decode AAC.
    const candidates = originalExtension
      ? [
          fileName,
          fileName.slice(0, -originalExtension.length) +
            (originalExtension === '.aac' ? '.mp3' : '.aac'),
        ]
      : [`${fileName}.aac`, `${fileName}.mp3`];

    let lastError: unknown = null;

    for (const candidate of candidates) {
      if (requestId !== audioRequestIdRef.current || !voiceEnabled) return;

      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 1;
      currentAudioRef.current = audio;

      try {
        const url = buildAudioUrl(candidate);

        const played = await new Promise<boolean>((resolve) => {
          let started = false;
          let settled = false;
          let startTimeoutId: number | undefined;

          const cleanup = () => {
            if (startTimeoutId !== undefined) {
              window.clearTimeout(startTimeoutId);
            }
            audio.onloadedmetadata = null;
            audio.oncanplay = null;
            audio.oncanplaythrough = null;
            audio.onerror = null;
            audio.onended = null;
          };

          const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(ok);
          };

          // Only timeout while waiting for the file to start.
          startTimeoutId = window.setTimeout(() => {
            if (!started) finish(false);
          }, 5000);

          const startPlayback = () => {
            if (started || settled) return;

            audio.play().then(() => {
              started = true;
              if (startTimeoutId !== undefined) {
                window.clearTimeout(startTimeoutId);
                startTimeoutId = undefined;
              }
            }).catch((err) => {
              lastError = err;
              finish(false);
            });
          };

          audio.onloadedmetadata = startPlayback;
          audio.oncanplay = startPlayback;
          audio.oncanplaythrough = startPlayback;

          audio.onended = () => finish(true);

          audio.onerror = (event) => {
            lastError = event;
            finish(false);
          };

          audio.src = url;
          audio.load();

          // Fallback for WebViews that delay media readiness events.
          window.setTimeout(() => {
            if (!started && !settled) startPlayback();
          }, 250);
        });

        if (requestId !== audioRequestIdRef.current) return;

        if (played) {
          currentAudioRef.current = null;
          return;
        }
      } catch (err) {
        lastError = err;
      }

      if (currentAudioRef.current === audio) {
        try {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        } catch {
          // Ignore cleanup errors.
        }
        currentAudioRef.current = null;
      }
    }

    console.error(`Bingo voice file could not be played: ${fileName}`, lastError);
  };

  const speakNumber = (letter: string, num: number) => {
    if (!voiceEnabled) return audioQueueRef.current;

    // Exact file convention: B-1.aac ... O-75.aac
    const fileName = `${letter}-${num}.aac`;

    // Queue recordings so one announcement can never cut another announcement.
    audioQueueRef.current = audioQueueRef.current
      .catch(() => undefined)
      .then(() => playRecordedFile(fileName));

    return audioQueueRef.current;
  };

  // Stop any playing recording when CallerView unmounts.
  useEffect(() => {
    return () => {
      audioRequestIdRef.current += 1;
      stopCurrentAudio();
    };
  }, []);

  // Keep the global voice setting synchronized with the UI toggle.
  const handleVoiceToggle = () => {
    setVoiceEnabled((previous) => {
      const next = !previous;
      setGlobalVoiceEnabled(next);
      if (!next) stopCurrentAudio();
      return next;
    });
  };

  // Start new game with Gamer Count
  const handleStartGame = async (
    gamerCount: number,
    capturedNumbers?: number[],
    capturedCards?: string[]
  ) => {
    if (!currentAgent) {
      setErrorMessage(t('selectAgentPrompt'));
      return;
    }

    if (currentAgent.balance < 50) {
      setErrorMessage(t('insufficientBalance') + ` (${currentAgent.balance} CR).`);
      return;
    }

    setIsStartingGame(true);
    setErrorMessage(null);
    setWinnerNotice(null);

    try {
      const res = await api.startGame(
        currentAgent.agentId,
        currentAgent.deviceId,
        gamerCount,
        capturedNumbers,
        capturedCards
      );
      if (!res.success) {
        setErrorMessage(res.error || t('failedToStartGame'));
      } else {
        setActiveGame(res.game);
        setCurrentNumber(null);
        setIsAutoCalling(false);
        gameStartPlayedGameIdRef.current = null;
        setIsStartModalOpen(false);
        onRefreshAgent();
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('failedToStartGame'));
    } finally {
      setIsStartingGame(false);
    }
  };

  // When a player says "BINGO!": Pause game immediately and open verification
  const handleBingoCalledPause = async () => {
    // Immediately stop auto caller
    setIsAutoCalling(false);

    if (activeGame && activeGame.status === 'IN_PROGRESS') {
      try {
        const res = await api.updateGame(activeGame.gameId, { status: 'PAUSED' });
        if (res.success && res.game) {
          setActiveGame(res.game);
        }
      } catch (e) {
        console.error('Error pausing game for bingo verification:', e);
      }
    }

    setIsVerifyOpen(true);
  };

  // Call Next Random Number
  const handleCallNextNumber = async () => {
    const currentG = activeGameRef.current;
    if (!currentG || currentG.status !== 'IN_PROGRESS') {
      setIsAutoCalling(false);
      return;
    }

    if (isCallingNextRef.current) return;
    isCallingNextRef.current = true;

    try {
      const called = currentG.calledNumbers;
      if (called.length >= 75) {
        setIsAutoCalling(false);
        setErrorMessage('All 75 Bingo numbers have been called!');
        return;
      }

      // Uncalled numbers pool (1 to 75)
      const calledSet = new Set(called);
      const uncalled: number[] = [];
      for (let i = 1; i <= 75; i++) {
        if (!calledSet.has(i)) {
          uncalled.push(i);
        }
      }

      if (uncalled.length === 0) {
        setIsAutoCalling(false);
        return;
      }

      // Pick random uncalled
      const randomIndex = Math.floor(Math.random() * uncalled.length);
      const pickedNum = uncalled[randomIndex];
      const letter = getBingoLetter(pickedNum);

      const updatedCalled = [...called, pickedNum];
      setCurrentNumber(pickedNum);
      await speakNumber(letter, pickedNum);

      if (uncalled.length <= 1) {
        setIsAutoCalling(false);
      }

      // Save to local database
      const res = await api.updateGame(currentG.gameId, {
        calledNumbers: updatedCalled,
      });
      if (res.success && res.game) {
        setActiveGame(res.game);
      }
    } catch (e) {
      console.error('Error updating game called numbers:', e);
    } finally {
      isCallingNextRef.current = false;
    }
  };

  // Manual / Progressive Single Ball Entry
  const handleAddManualNumber = async (pickedNum: number) => {
    if (!activeGame || (activeGame.status !== 'IN_PROGRESS' && activeGame.status !== 'PAUSED')) return;
    if (pickedNum < 1 || pickedNum > 75) return;
    if (activeGame.calledNumbers.includes(pickedNum)) return;

    const letter = getBingoLetter(pickedNum);
    const updatedCalled = [...activeGame.calledNumbers, pickedNum];
    setCurrentNumber(pickedNum);
    await speakNumber(letter, pickedNum);

    try {
      const res = await api.updateGame(activeGame.gameId, {
        calledNumbers: updatedCalled,
      });
      if (res.success && res.game) {
        setActiveGame(res.game);
      }
    } catch (e) {
      console.error('Error adding drawn number to session:', e);
      throw e;
    }
  };

  // Batch Numbers Entry
  const handleAddBatchNumbers = async (newNumbers: number[]) => {
    if (!activeGame || (activeGame.status !== 'IN_PROGRESS' && activeGame.status !== 'PAUSED')) return;
    const existing = new Set(activeGame.calledNumbers);
    const toAdd = newNumbers.filter((n) => n >= 1 && n <= 75 && !existing.has(n));
    if (toAdd.length === 0) return;

    const updatedCalled = [...activeGame.calledNumbers, ...toAdd];
    const latestNum = toAdd[toAdd.length - 1];
    setCurrentNumber(latestNum);
    await speakNumber(getBingoLetter(latestNum), latestNum);

    try {
      const res = await api.updateGame(activeGame.gameId, {
        calledNumbers: updatedCalled,
      });
      if (res.success && res.game) {
        setActiveGame(res.game);
      }
    } catch (e) {
      console.error('Error batch adding drawn numbers to session:', e);
      throw e;
    }
  };

  // Undo Last Called Number
  const handleUndoLastNumber = async () => {
    if (!activeGame || activeGame.calledNumbers.length === 0) return;
    const updatedCalled = activeGame.calledNumbers.slice(0, -1);
    const newCurrent = updatedCalled.length > 0 ? updatedCalled[updatedCalled.length - 1] : null;
    setCurrentNumber(newCurrent);

    try {
      const res = await api.updateGame(activeGame.gameId, {
        calledNumbers: updatedCalled,
      });
      if (res.success && res.game) {
        setActiveGame(res.game);
      }
    } catch (e) {
      console.error('Error undoing last called number:', e);
      throw e;
    }
  };

  // Auto-caller countdown & execution effect (1s - 3s)
  useEffect(() => {
    setSecondsUntilNextCall(autoIntervalSec);
  }, [autoIntervalSec]);

  useEffect(() => {
    if (!isAutoCalling || !activeGame || activeGame.status !== 'IN_PROGRESS') {
      if (autoCallTimerRef.current) {
        clearInterval(autoCallTimerRef.current);
        autoCallTimerRef.current = null;
      }
      setSecondsUntilNextCall(autoIntervalSec);
      return;
    }

    setSecondsUntilNextCall(autoIntervalSec);

    autoCallTimerRef.current = setInterval(() => {
      setSecondsUntilNextCall((prev) => {
        if (prev <= 1) {
          handleCallNextNumber();
          return autoIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoCallTimerRef.current) {
        clearInterval(autoCallTimerRef.current);
        autoCallTimerRef.current = null;
      }
    };
  }, [isAutoCalling, activeGame?.gameId, activeGame?.status, autoIntervalSec]);

  // Auto Caller is the single control for starting, pausing, and resuming the game.
  // Starting Auto Caller begins automatic ball calls. Clicking it while running
  // pauses both the auto caller and the game. Clicking again resumes both.
  const handleAutoCallerToggle = async () => {
    if (!activeGame) {
      setIsStartModalOpen(true);
      return;
    }

    if (activeGame.status === 'PAUSED') {
      setIsAutoCalling(true);
      try {
        const res = await api.updateGame(activeGame.gameId, { status: 'IN_PROGRESS' });
        if (res.success && res.game) {
          setActiveGame(res.game);
        } else {
          setIsAutoCalling(false);
        }
      } catch (e) {
        setIsAutoCalling(false);
        console.error('Error resuming game from Auto Caller:', e);
      }
      return;
    }

    if (activeGame.status !== 'IN_PROGRESS') return;

    if (isAutoCalling) {
      setIsAutoCalling(false);
      try {
        const res = await api.updateGame(activeGame.gameId, { status: 'PAUSED' });
        if (res.success && res.game) {
          setActiveGame(res.game);
        }
      } catch (e) {
        console.error('Error pausing game from Auto Caller:', e);
      }
      return;
    }

    // The first Auto Caller click for a game plays the dedicated game-start recording.
    // It is intentionally tracked per game so Pause -> Resume does not replay it.
    if (gameStartPlayedGameIdRef.current !== activeGame.gameId) {
      gameStartPlayedGameIdRef.current = activeGame.gameId;
      void playRecordedFile('Game start.mp3');
    }

    setIsAutoCalling(true);
  };

  // End Game
  const handleEndGame = async () => {
    if (!activeGame) return;
    setIsAutoCalling(false);
    try {
      const res = await api.updateGame(activeGame.gameId, { status: 'COMPLETED' });
      if (res.success && res.game) {
        setLatestCompletedGame(res.game);
        setActiveGame(null);
        setCurrentNumber(null);
      }
    } catch (e) {
      console.error('Error ending game:', e);
    }
  };

  // Board Columns for B-I-N-G-O (1-15, 16-30, etc.)
  const boardColumns = [
    { letter: 'B', range: [1, 15], bg: 'bg-blue-600', border: 'border-blue-500' },
    { letter: 'I', range: [16, 30], bg: 'bg-rose-600', border: 'border-rose-500' },
    { letter: 'N', range: [31, 45], bg: 'bg-amber-500', border: 'border-amber-400' },
    { letter: 'G', range: [46, 60], bg: 'bg-emerald-600', border: 'border-emerald-500' },
    { letter: 'O', range: [61, 75], bg: 'bg-purple-600', border: 'border-purple-500' },
  ];

  const calledSet = new Set(activeGame ? activeGame.calledNumbers : (latestCompletedGame?.calledNumbers || []));
  const currentLetter = currentNumber !== null ? getBingoLetter(currentNumber) : '';

  return (
    <div className="space-y-4">
      {/* Top Banner with Game Status & Controls */}
      <div
        className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md transition-colors ${
          isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black font-mono shadow-md shadow-emerald-600/30">
            {activeGame ? 'ON' : 'OFF'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-extrabold text-base tracking-tight ${isNight ? 'text-white' : 'text-slate-900'}`}>
                {t('liveBingoStage')}
              </h2>
              {activeGame && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${
                    activeGame.status === 'IN_PROGRESS'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-amber-500 text-slate-950 font-bold'
                  }`}
                >
                  {activeGame.status === 'IN_PROGRESS' ? t('live') : t('paused')}
                </span>
              )}
            </div>
            <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeGame
                ? `${t('gameSession')}: ${activeGame.gameId} • ${activeGame.gamerCount || 10} ${t('gamerCountLabel')}`
                : t('noActiveGameDesc')}
            </p>

            {/* Display Captured Numbers for active game */}
            {activeGame && activeGame.capturedNumbers && activeGame.capturedNumbers.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{t('capturedCardsCount')} ({activeGame.capturedNumbers.length}):</span>
                </span>
                <div className="flex items-center gap-1 flex-wrap max-h-12 overflow-y-auto">
                  {activeGame.capturedNumbers.map((num) => (
                    <span
                      key={num}
                      className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold"
                    >
                      #{num}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {activeGame ? (
            <div className="flex items-center gap-2">
              {/* BIG BINGO VERIFY BUTTON (Immediately pauses game and opens checker) */}
              <button
                onClick={handleBingoCalledPause}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 flex items-center gap-2 transition cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>{isAmharic ? 'ቢንጎ! አሸናፊ ፈትሽ (አቁም)' : 'Bingo! Pause & Check Winner'}</span>
              </button>

              <button
                onClick={handleEndGame}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                {t('endGame')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* After Game Check Number */}
              {latestCompletedGame && (
                <button
                  onClick={() => setIsAfterGameCheckOpen(true)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isNight
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <SearchCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('afterGameCheck')}</span>
                </button>
              )}

              {/* Start Bingo Game Button -> Prompts for gamer quantity! */}
              <button
                onClick={() => setIsStartModalOpen(true)}
                disabled={isStartingGame || !currentAgent || currentAgent.balance < 50}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isStartingGame ? t('startingGame') : t('startBingoGame')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs p-1 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Caller Stage Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Big Screen Projector & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Large Current Number Display */}
          <div
            className={`border rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[280px] transition-colors ${
              isNight
                ? 'bg-slate-900 border-slate-800 shadow-2xl text-white'
                : 'bg-white border-slate-200 shadow-xl text-slate-900'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>

            {activeGame ? (
              <>
                <div className="flex items-center justify-between w-full mb-3 text-xs">
                  <span className={`font-mono flex items-center gap-1.5 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>{activeGame.gameId}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {activeGame.gamerCount && (
                      <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[11px] flex items-center gap-1 ${
                        isNight ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <Users className="w-3 h-3" />
                        <span>{activeGame.gamerCount} {t('gamerCountLabel')}</span>
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-xs ${
                      isNight ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {activeGame.calledNumbers.length} / 75 {t('calledCount')}
                    </span>
                  </div>
                </div>

                {currentNumber ? (
                  <div className="my-2 animate-scaleIn">
                    <div className="text-6xl sm:text-7xl font-black font-mono tracking-wider flex items-center justify-center gap-3">
                      <span
                        className={`px-4 py-1 rounded-2xl text-white shadow-md ${
                          currentLetter === 'B'
                            ? 'bg-blue-600'
                            : currentLetter === 'I'
                            ? 'bg-rose-600'
                            : currentLetter === 'N'
                            ? 'bg-amber-600'
                            : currentLetter === 'G'
                            ? 'bg-emerald-600'
                            : 'bg-purple-600'
                        }`}
                      >
                        {currentLetter}
                      </span>
                      <span className={`drop-shadow-lg ${isNight ? 'text-white' : 'text-slate-900'}`}>{currentNumber}</span>
                    </div>
                    <div className={`text-xs font-mono mt-2 uppercase tracking-widest font-semibold ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isAmharic ? `ፊደል ${getAmharicLetterPhonetic(currentLetter)} • ቁጥር ${currentNumber!}` : `Letter ${currentLetter} • Number ${currentNumber!}`}
                    </div>
                  </div>
                ) : (
                  <div className="my-6 text-center">
                    <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-2 animate-pulse ${
                      isNight ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}>
                      <Radio className="w-8 h-8" />
                    </div>
                    <h3 className={`font-bold text-base ${isNight ? 'text-slate-200' : 'text-slate-800'}`}>{t('gameReady')}</h3>
                    <p className={`text-xs ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t('clickToStartInstruction')}
                    </p>
                  </div>
                )}

                {/* Last 5 Numbers Ticker */}
                <div className={`w-full pt-4 mt-2 border-t ${isNight ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className={`text-[10px] uppercase font-bold tracking-wider text-left mb-1.5 ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('recentBalls')}:
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {activeGame.calledNumbers.slice(-5).reverse().map((num, i) => {
                      const lettr = getBingoLetter(num);
                      return (
                        <div
                          key={num}
                          className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border shrink-0 ${
                            i === 0
                              ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-400/50 shadow-md'
                              : isNight
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lettr}-{num}
                        </div>
                      );
                    })}
                    {activeGame.calledNumbers.length === 0 && (
                      <span className="text-xs text-slate-400 italic">{t('noBallsCalled')}</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-3 ${
                  isNight ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}>
                  <Radio className="w-8 h-8" />
                </div>
                <h3 className={`font-bold text-lg mb-1 ${isNight ? 'text-slate-100' : 'text-slate-900'}`}>{t('noActiveGame')}</h3>
                <p className={`text-xs max-w-xs mb-4 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('gameFeeNotice')}
                </p>
                <button
                  onClick={() => setIsStartModalOpen(true)}
                  disabled={isStartingGame || !currentAgent || currentAgent.balance < 50}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition flex items-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isStartingGame ? t('startingGame') : t('startBingoGame')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Game Controls & Auto-Caller Bar */}
          {activeGame && (
            <div
              className={`border rounded-2xl p-4 shadow-xl space-y-3 transition-colors ${
                isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Primary Bingo Verification Action */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={handleBingoCalledPause}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{isAmharic ? 'ቢንጎ! ፈትሽ' : 'Bingo! Check'}</span>
                </button>
              </div>

              {/* Quick Hall Celebration Replay button if winner verified */}
              {winnerNotice && (
                <button
                  onClick={() => setIsWinnerOverlayOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 animate-pulse cursor-pointer"
                >
                  <PartyPopper className="w-4 h-4" />
                  <span>{t('showRoomCelebration')} ({winnerNotice.cardId})</span>
                </button>
              )}

              {/* Secondary Controls (Auto Caller 1s - 3s, Voice, End) */}
              <div className={`pt-3 border-t space-y-2.5 text-xs ${isNight ? 'border-slate-800' : 'border-slate-200'}`}>
                {/* Auto Caller start/pause/resume, 1s - 3s Speed Pills & Stepper */}
                <div className={`p-2.5 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 ${
                  isNight ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  {/* Start / Stop Auto Calling Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoCallerToggle}
                      className={`px-3.5 py-2 rounded-xl font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
                        isAutoCalling
                          ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                          : isNight
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      }`}
                      title={
                        activeGame.status === 'PAUSED'
                          ? 'Resume Auto Caller'
                          : isAutoCalling
                          ? 'Pause Auto Caller'
                          : 'Start Auto Caller (1s - 3s interval)'
                      }
                    >
                      {isAutoCalling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>
                        {activeGame.status === 'PAUSED'
                          ? t('resume')
                          : isAutoCalling
                          ? t('pause')
                          : t('autoCaller')}
                      </span>
                    </button>

                    {/* Live countdown badge when active */}
                    {isAutoCalling && (
                      <div className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono text-xs font-bold ${
                        isNight ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                        <span>{t('autoNextIn')}: <strong>{secondsUntilNextCall}s</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Speed Interval Controls: 1s to 3s */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                      isNight ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <Timer className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('chooseAutoSpeed')}:</span>
                    </span>

                    {/* Minus / Faster button */}
                    <button
                      type="button"
                      onClick={() => setAutoIntervalSec((prev) => Math.max(1, prev - 1))}
                      disabled={autoIntervalSec <= 1}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition disabled:opacity-30 cursor-pointer ${
                        isNight ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                      }`}
                      title="Faster (-1s)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    {/* 1s to 8s Quick Buttons */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((sec) => {
                        const isSelected = autoIntervalSec === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setAutoIntervalSec(sec)}
                            className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition cursor-pointer border flex items-center justify-center ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm shadow-amber-500/30 ring-2 ring-amber-400/40'
                                : isNight
                                ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                            }`}
                            title={`${sec} second${sec > 1 ? 's' : ''} auto-call interval`}
                          >
                            {sec}s
                          </button>
                        );
                      })}
                    </div>

                    {/* Plus / Slower button */}
                    <button
                      type="button"
                      onClick={() => setAutoIntervalSec((prev) => Math.min(3, prev + 1))}
                      disabled={autoIntervalSec >= 3}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition disabled:opacity-30 cursor-pointer ${
                        isNight ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                      }`}
                      title="Slower (+1s)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Game Session Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Voice Callout Mute Toggle */}
                  <button
                    onClick={handleVoiceToggle}
                    className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-2 transition cursor-pointer ${
                      voiceEnabled
                        ? isNight
                          ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : isNight
                        ? 'bg-slate-950 text-slate-500 border-slate-800'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                    title={voiceEnabled ? 'Voice Callout Enabled' : 'Voice Callout Muted'}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{voiceEnabled ? t('voiceOn') : t('voiceOff')}</span>
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* End Game */}
                    <button
                      onClick={handleEndGame}
                      className={`px-3.5 py-1.5 rounded-xl border font-semibold transition cursor-pointer ${
                        isNight
                          ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800/40'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      }`}
                    >
                      {t('endGame')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form for Batch Input or Progressive Entry of Drawn Bingo Numbers */}
          {activeGame && activeGame.status !== 'IN_PROGRESS' && (
            <DrawnNumbersEntryForm
              activeGame={activeGame}
              onAddNumber={handleAddManualNumber}
              onAddBatchNumbers={handleAddBatchNumbers}
              onUndoLastNumber={handleUndoLastNumber}
              isNight={isNight}
              disabled={isAutoCalling}
            />
          )}
        </div>

        {/* Right Column: 1-75 Master Board (7 Cols) */}
        <div
          className={`lg:col-span-7 border rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 transition-colors ${
            isNight
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-white border-slate-200 shadow-xl text-slate-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isNight ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm sm:text-base ${isNight ? 'text-slate-100' : 'text-slate-900'}`}>
                {t('ballMasterBoard')}
              </span>
              <span className={`text-[11px] font-mono ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                ({t('standardGrid')})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {t('calledCount')} ({calledSet.size})
              </span>
              <span className={`flex items-center gap-1 font-medium text-[11px] ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isNight ? 'bg-slate-700' : 'bg-slate-300'}`}></span> {t('remainingCount')} ({75 - calledSet.size})
              </span>
            </div>
          </div>

          {/* 5 Rows for B, I, N, G, O */}
          <div className="space-y-2">
            {boardColumns.map((col) => {
              const [start, end] = col.range;
              const nums: number[] = [];
              for (let i = start; i <= end; i++) {
                nums.push(i);
              }

              return (
                <div key={col.letter} className="flex items-center gap-1.5">
                  {/* Letter Header Pill */}
                  <div
                    className={`w-10 sm:w-12 h-9 sm:h-10 rounded-xl flex items-center justify-center font-black font-mono text-base sm:text-lg border ${col.bg} text-slate-950 shadow`}
                  >
                    {col.letter}
                  </div>

                  {/* 15 Numbers in this Column */}
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {nums.map((n) => {
                      const isCalled = calledSet.has(n);
                      const isJustCalled = currentNumber === n;

                      let style = isNight
                        ? 'bg-slate-950/80 text-slate-500 border-slate-800'
                        : 'bg-slate-50 text-slate-400 border-slate-200';

                      if (isJustCalled) {
                        style = 'bg-emerald-500 text-white font-black border-emerald-300 ring-2 ring-emerald-400 shadow-lg animate-pulse';
                      } else if (isCalled) {
                        style = 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm';
                      } else if (activeGame) {
                        style += ' hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer hover:scale-105 active:scale-95';
                      }

                      return (
                        <div
                          key={n}
                          onClick={() => {
                            if (activeGame && !isCalled && !isAutoCalling) {
                              handleAddManualNumber(n);
                            }
                          }}
                          title={!isCalled && activeGame ? `${t('drawBallButton')}: ${col.letter}-${n}` : undefined}
                          className={`h-9 sm:h-10 rounded-lg border flex items-center justify-center font-mono text-xs sm:text-sm transition-all select-none ${style}`}
                        >
                          {n}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick instructions for caller */}
          <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
            isNight ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span>
              💡 <strong>{t('operatorTip')}:</strong> {t('clickBoardToDraw')}. {isAmharic ? 'ተጫዋች "ቢንጎ!" ሲል "ቢንጎ! አሸናፊ ፈትሽ" የሚለውን ይጫኑ፤ ጨዋታው ቆሞ ካርዱ ይመረመራል።' : 'When a player calls "Bingo!", click "Bingo! Pause & Check Winner" to immediately pause the game and verify.'}
            </span>
          </div>
        </div>
      </div>

      {/* Start Game Modal (with Gamer Quantity input) */}
      <StartGameModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onConfirmStart={handleStartGame}
        agentBalance={currentAgent?.balance || 0}
        isStarting={isStartingGame}
      />

      {/* Winner Verification Modal for ACTIVE game */}
      {activeGame && (
        <WinnerVerificationModal
          isOpen={isVerifyOpen}
          onClose={() => setIsVerifyOpen(false)}
          gameId={activeGame.gameId}
          calledNumbers={activeGame.calledNumbers}
          agentId={activeGame.agentId}
          capturedNumbers={activeGame.capturedNumbers}
          capturedCards={activeGame.capturedCards}
          onWinnerVerified={(data) => {
            setIsAutoCalling(false);
            winnerVoicePlayedCardIdRef.current = data.cardId;
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            void playRecordedFile('This is winner.mp3');
            setWinnerOverlayData(data);
            setIsWinnerOverlayOpen(true);
          }}
          onWinnerConfirmed={(cardId, pattern, prize, extraData) => {
            setIsAutoCalling(false);
            // Play the dedicated recorded winner announcement from public/audio/bingo/.
            if (winnerVoicePlayedCardIdRef.current !== cardId) {
              winnerVoicePlayedCardIdRef.current = cardId;
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              void playRecordedFile('This is winner.mp3');
            }
            setWinnerNotice({ cardId, pattern, prize });
            if (extraData) {
              setWinnerOverlayData({
                cardId,
                pattern,
                prize,
                gameId: activeGame.gameId,
                calledNumbers: activeGame.calledNumbers,
                ...extraData,
              });
            } else {
              setWinnerOverlayData({
                cardId,
                pattern,
                prize,
                gameId: activeGame.gameId,
                calledNumbers: activeGame.calledNumbers,
              });
            }
            setIsWinnerOverlayOpen(true);
            loadGames();
          }}
        />
      )}

      {/* After Game Card Checker (for latest completed game) */}
      {latestCompletedGame && !activeGame && (
        <WinnerVerificationModal
          isOpen={isAfterGameCheckOpen}
          onClose={() => setIsAfterGameCheckOpen(false)}
          gameId={latestCompletedGame.gameId}
          calledNumbers={latestCompletedGame.calledNumbers}
          agentId={latestCompletedGame.agentId}
          capturedNumbers={latestCompletedGame.capturedNumbers}
          capturedCards={latestCompletedGame.capturedCards}
          isAfterGameCheck={true}
          onWinnerConfirmed={() => {
            loadGames();
            onRefreshAgent();
          }}
        />
      )}

      {/* Animated Bingo Winner Overlay for Caller Screen / Room Projector */}
      <BingoWinnerOverlay
        isOpen={isWinnerOverlayOpen}
        onClose={() => setIsWinnerOverlayOpen(false)}
        winner={winnerOverlayData}
        onConfirmEndGame={handleEndGame}
        voiceEnabled={voiceEnabled}
      />
    </div>
  );
};
