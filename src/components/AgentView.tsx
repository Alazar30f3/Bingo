import React, { useState, useEffect } from 'react';
import { Agent, BingoCard, Game } from '../types/bingo';
import { api } from '../services/api';
import { StartGameModal } from './StartGameModal';
import { WinnerVerificationModal } from './WinnerVerificationModal';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  Coins,
  Play,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  SearchCheck,
  Monitor,
  Volume2,
} from 'lucide-react';

interface AgentViewProps {
  currentAgent: Agent | null;
  cards?: BingoCard[];
  onStartGame: () => void;
  onRefreshData: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  networkMode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE';
}

export const AgentView: React.FC<AgentViewProps> = ({
  currentAgent,
  cards = [],
  onStartGame,
  onRefreshData,
  onTriggerSync,
  isSyncing,
  networkMode,
}) => {
  const { t, isAmharic } = useLanguage();
  const { isNight } = useTheme();

  // Modals & State
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [latestGame, setLatestGame] = useState<Game | null>(null);

  // Quick Check Card
  const [quickCheckInput, setQuickCheckInput] = useState('');
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [autoVoiceCheck, setAutoVoiceCheck] = useState(false);

  useEffect(() => {
    if (currentAgent) {
      loadLatestGame();
    }
  }, [currentAgent]);

  const loadLatestGame = async () => {
    if (!currentAgent) return;
    try {
      const gRes = await api.getGames(currentAgent.agentId);
      if (gRes.success && gRes.games.length > 0) {
        setLatestGame(gRes.games[0]);
      }
    } catch (e) {
      console.error('Error loading games for agent:', e);
    }
  };

  if (!currentAgent) {
    return (
      <div className={`p-8 text-center border rounded-3xl ${
        isNight ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
      }`}>
        <h3 className="text-lg font-bold">{isAmharic ? 'ምንም ወኪል አልተመረጠም' : 'No Agent Selected'}</h3>
        <p className="text-xs text-slate-400 mt-1">
          {isAmharic ? 'እባክዎ ከላይኛው አሞሌ ላይ የወኪል መገለጫ ይምረጡ።' : 'Please select an agent profile from the header to view this station.'}
        </p>
      </div>
    );
  }

  const isLowBalance = currentAgent.balance < 50;

  // Normalize card ID input (e.g. "12" -> "CARD-0012")
  const normalizeCardId = (input: string): string => {
    const raw = input.trim().toUpperCase();
    if (!raw) return '';
    if (/^\d+$/.test(raw)) {
      return `CARD-${raw.padStart(4, '0')}`;
    }
    if (raw.startsWith('CARD-')) {
      const numPart = raw.replace('CARD-', '');
      if (/^\d+$/.test(numPart)) {
        return `CARD-${numPart.padStart(4, '0')}`;
      }
    }
    return raw;
  };

  const handleStartGameWithCount = async (
    gamerCount: number,
    capturedNumbers: number[],
    capturedCards: string[]
  ) => {
    if (!currentAgent || currentAgent.balance < 50) return;
    setIsStartingGame(true);
    try {
      const res = await api.startGame(
        currentAgent.agentId,
        currentAgent.deviceId,
        gamerCount,
        capturedNumbers,
        capturedCards
      );
      if (res.success) {
        onRefreshData();
        setIsStartModalOpen(false);
        // Switch to the live caller board
        onStartGame();
      }
    } catch (e) {
      console.error('Failed to start game:', e);
    } finally {
      setIsStartingGame(false);
    }
  };

  const handleQuickCardCheck = (withSound = false) => {
    const target = normalizeCardId(quickCheckInput);
    if (!target) return;
    setAutoVoiceCheck(withSound);
    setIsCheckModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Station Credit & Session Launcher (Full Width) */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-xl flex flex-col justify-between transition-colors ${
          isLowBalance
            ? isNight
              ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-600/50 text-white'
              : 'bg-gradient-to-br from-rose-50 via-white to-white border-rose-300 text-slate-900'
            : isNight
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className={`font-bold tracking-wide uppercase ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('balance')}
              </span>
              <span className={`font-mono text-xs px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 ${
                isNight
                  ? 'bg-slate-950 border-slate-800 text-emerald-400'
                  : 'bg-slate-100 border-slate-200 text-emerald-700'
              }`}>
                <Monitor className="w-3.5 h-3.5" />
                <span>{currentAgent.deviceId}</span>
              </span>
            </div>
            {currentAgent.lastSync && (
              <span className="text-[11px] font-mono text-slate-400">
                {isAmharic ? 'የመጨረሻ ማመሳሰል:' : 'Last Sync:'} {new Date(currentAgent.lastSync).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="my-5 flex items-baseline gap-3">
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {currentAgent.balance}
            </div>
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-500 dark:text-slate-400">CREDITS</span>
          </div>

          {isLowBalance ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                {isAmharic
                  ? 'ቀሪ ሂሳብዎ ዝቅተኛ ነው! እባክዎ ከማዕከላዊ አገልጋይ ጋር አመሳስለው ክሬዲት ይሙሉ'
                  : 'Low credit balance! Synchronize with the central server when you need package top-up.'}
              </span>
            </div>
          ) : (
            <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAmharic ? 'የእያንዳንዱ ጨዋታ ክፍያ 50 ክሬዲት ነው። ለ' : 'Each game session deducts 50 CR. Valid for approximately'}{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                {Math.floor(currentAgent.balance / 50)} {isAmharic ? 'ተጨማሪ ጨዋታዎች' : 'more games'}
              </strong>.
            </p>
          )}
        </div>

        {/* Action Buttons: Green Start Game & Sync */}
        <div className="flex flex-wrap items-center gap-3 pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setIsStartModalOpen(true)}
            disabled={isLowBalance}
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{t('startBingoGame')}</span>
          </button>

          <button
            onClick={onTriggerSync}
            disabled={isSyncing || networkMode === 'OFFLINE'}
            className={`px-4 py-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 ${
              isNight
                ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-200'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : t('sync')}</span>
          </button>
        </div>
      </div>

      {/* After Game Quick Card Checker ("after game check number") */}
      <div
        className={`border rounded-3xl p-5 shadow-lg space-y-3 transition-colors ${
          isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <SearchCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm tracking-tight">
                {t('checkCardNumber')}
              </h4>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('afterGameCheckDesc')}
              </p>
            </div>
          </div>

          {latestGame && (
            <span className="text-xs font-mono px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {isAmharic ? 'የቅርብ ጊዜ ጨዋታ:' : 'Latest Game:'} <strong className="text-emerald-600 dark:text-emerald-400">{latestGame.gameId}</strong> ({latestGame.calledNumbers.length} {isAmharic ? 'ኳሶች' : 'balls'})
            </span>
          )}
        </div>

        <div className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickCheckInput}
              onChange={(e) => setQuickCheckInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickCardCheck();
              }}
              placeholder={isAmharic ? 'የካርድ ቁጥር ያስገቡ (ለምሳሌ 12)' : 'Enter Card Number (e.g. 12 or CARD-0012)'}
              className={`w-full border rounded-2xl px-4 py-2.5 pl-10 font-mono text-sm tracking-wider uppercase transition outline-none ${
                isNight
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white'
              }`}
            />
            <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${isNight ? 'text-slate-500' : 'text-slate-400'}`} />
          </div>

          <button
            type="button"
            onClick={() => handleQuickCardCheck(false)}
            className="px-4 sm:px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            {isAmharic ? 'ፈትሽ' : 'Check'}
          </button>

          <button
            type="button"
            onClick={() => handleQuickCardCheck(true)}
            className="px-4 sm:px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
            title='Check Card and Announce Voice: "This is winner", "This is a late", or "This is not winner"'
          >
            <Volume2 className="w-3.5 h-3.5 text-slate-950" />
            <span>{t('soundCheck')}</span>
          </button>
        </div>
      </div>

      {/* Start Game Modal (with Gamer Quantity input) */}
      <StartGameModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onConfirmStart={handleStartGameWithCount}
        agentBalance={currentAgent.balance}
        isStarting={isStartingGame}
      />

      {/* Winner Verification / After Game Check Modal */}
      {latestGame && (
        <WinnerVerificationModal
          isOpen={isCheckModalOpen}
          onClose={() => setIsCheckModalOpen(false)}
          gameId={latestGame.gameId}
          calledNumbers={latestGame.calledNumbers}
          agentId={currentAgent.agentId}
          capturedNumbers={latestGame.capturedNumbers}
          capturedCards={latestGame.capturedCards}
          isAfterGameCheck={true}
          initialCardId={normalizeCardId(quickCheckInput)}
          autoSoundCheck={autoVoiceCheck}
          onWinnerConfirmed={() => {
            loadLatestGame();
            onRefreshData();
          }}
        />
      )}
    </div>
  );
};
