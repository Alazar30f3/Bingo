import React from 'react';
import { UserRole, Agent } from '../types/bingo';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Shield,
  User,
  Radio,
  Coins,
  Tv,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  currentAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  agents: Agent[];
  networkMode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE';
  onChangeNetworkMode: (mode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE') => void;
  pendingSyncCount: number;
  isSyncing: boolean;
  onTriggerSync: () => void;
  onOpenPdfModal: () => void;
  onOpenElectronInfo: () => void;
  currentUser?: {
    role: 'SUPER_ADMIN' | 'AGENT';
    name: string;
    username?: string;
    agent?: Agent;
  } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  currentAgent,
  onSelectAgent,
  agents,
  networkMode,
  onChangeNetworkMode,
  pendingSyncCount,
  isSyncing,
  onTriggerSync,
  onOpenPdfModal,
  onOpenElectronInfo,
  currentUser,
  onLogout,
}) => {
  const { t, isAmharic } = useLanguage();
  const { isNight } = useTheme();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <header
      className={`backdrop-blur sticky top-0 z-40 px-4 py-3 transition-colors duration-200 ${
        isNight
          ? 'bg-slate-900/95 border-b border-slate-800'
          : 'bg-white border-b border-slate-200 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/40 shrink-0">
            <span className="font-black font-mono text-xl">75</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-extrabold tracking-tight text-base sm:text-lg ${isNight ? 'text-white' : 'text-slate-900'}`}>
                {t('appTitle')}
              </h1>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isNight
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {t('offlinePcBadge')}
              </span>
            </div>
            <p className={`text-xs hidden sm:block ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('appDescription')}
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div
          className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
            isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {isSuperAdmin && (
            <button
              onClick={() => onSelectRole('ADMIN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentRole === 'ADMIN'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : isNight
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('superAdmin')}</span>
            </button>
          )}

          <button
            onClick={() => onSelectRole('AGENT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentRole === 'AGENT'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : isNight
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t('agentTerminal')}</span>
          </button>

          <button
            onClick={() => onSelectRole('CALLER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentRole === 'CALLER'
                ? 'bg-emerald-600 text-white shadow-md font-bold ring-2 ring-emerald-400/50'
                : isNight
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('callerBoard')}</span>
          </button>
        </div>

        {/* Status Indicators, Theme, Language Switcher & Fast Actions */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Light / Night Mode Switcher */}
          <ThemeSwitcher variant="pill" />

          {/* Language Switcher */}
          <LanguageSwitcher variant="pill" />

          {/* Active Agent Selector if Admin is viewing agent terminal */}
          {isSuperAdmin && (currentRole === 'AGENT' || currentRole === 'CALLER') && (
            <div
              className={`flex items-center gap-1 border rounded-lg px-2.5 py-1.5 ${
                isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <span className={`text-[11px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('activeAgent')}
              </span>
              <select
                value={currentAgent?.agentId || ''}
                onChange={(e) => {
                  const found = agents.find((a) => a.agentId === e.target.value);
                  if (found) onSelectAgent(found);
                }}
                className={`bg-transparent font-bold outline-none cursor-pointer text-xs ${
                  isNight ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                {agents.map((a) => (
                  <option
                    key={a.agentId}
                    value={a.agentId}
                    className={isNight ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}
                  >
                    {a.name} ({a.agentId}) - {a.balance} CR
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Balance Pill */}
          {currentAgent && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold ${
                currentAgent.balance < 100
                  ? isNight
                    ? 'bg-rose-950/40 border-rose-600/40 text-rose-400 animate-pulse'
                    : 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                  : isNight
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
              title={t('balance')}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{currentAgent.balance} CR</span>
            </div>
          )}

          {/* Print Cards Shortcut (hidden in Agent dashboard) */}
          {currentRole !== 'AGENT' && (
            <button
              onClick={onOpenPdfModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                isNight
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 border-slate-200'
              }`}
              title={t('printCards')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{t('printCards')}</span>
            </button>
          )}

          {/* Network Mode Simulator */}
          <div
            className={`flex items-center border rounded-lg p-0.5 ${
              isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => onChangeNetworkMode('ONLINE')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                networkMode === 'ONLINE'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : isNight
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Central MongoDB Atlas Connected"
            >
              <Wifi className="w-3 h-3" />
              <span className="hidden md:inline">{t('online')}</span>
            </button>
            <button
              onClick={() => onChangeNetworkMode('SLOW_2G')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                networkMode === 'SLOW_2G'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : isNight
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Simulate slow 2G connection"
            >
              <span>{t('slow2g')}</span>
            </button>
            <button
              onClick={() => onChangeNetworkMode('OFFLINE')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                networkMode === 'OFFLINE'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : isNight
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Simulate zero-internet offline village mode"
            >
              <WifiOff className="w-3 h-3" />
              <span className="hidden md:inline">{t('offline')}</span>
            </button>
          </div>

          {/* 1-Click Sync Trigger - Green Button */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing || networkMode === 'OFFLINE'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              networkMode === 'OFFLINE'
                ? isNight
                  ? 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 border-emerald-500'
            }`}
            title={
              networkMode === 'OFFLINE'
                ? t('offlineSyncNotice')
                : `Synchronize local SQLite transactions and games with MongoDB Atlas (${pendingSyncCount} pending)`
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{t('sync')}</span>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-black">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* User Account / Logout */}
          {currentUser && (
            <div className={`flex items-center gap-2 pl-2 border-l ${isNight ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="hidden lg:block text-right">
                <div className={`font-bold text-xs truncate max-w-[120px] ${isNight ? 'text-slate-200' : 'text-slate-800'}`}>
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {currentUser.role === 'SUPER_ADMIN' ? t('superAdmin') : currentUser.agent?.agentId}
                </div>
              </div>
              <button
                onClick={onLogout}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isNight
                    ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border-slate-700'
                    : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border-slate-200'
                }`}
                title={t('logOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
