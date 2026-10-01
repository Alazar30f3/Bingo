import React, { useState, useEffect } from 'react';
import { UserRole, Agent, BingoCard, AuthUser } from './types/bingo';
import { api } from './services/api';
import { Header } from './components/Header';
import { AdminView } from './components/AdminView';
import { AgentView } from './components/AgentView';
import { CallerView } from './components/CallerView';
import { LoginPage } from './components/LoginPage';
import { PdfExportModal } from './components/PdfExportModal';
import { ElectronInfoModal } from './components/ElectronInfoModal';
import { PlayerCardChecker } from './components/PlayerCardChecker';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import {
  Laptop,
  CheckCircle2,
  AlertCircle,
  Database,
  Radio,
  FileSpreadsheet,
  Coins,
  Shield,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const { isNight } = useTheme();
  const [currentUser, setCurrentUser] = useState<{
    role: 'SUPER_ADMIN' | 'AGENT';
    name: string;
    username?: string;
    agent?: Agent;
    token?: string;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('bingo_session_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>('CALLER');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [networkMode, setNetworkMode] = useState<'ONLINE' | 'SLOW_2G' | 'OFFLINE'>('ONLINE');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isElectronModalOpen, setIsElectronModalOpen] = useState(false);
  const [isPlayerCheckerOpen, setIsPlayerCheckerOpen] = useState(false);

  useEffect(() => {
    loadInitialAppData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('bingo_session_user', JSON.stringify(currentUser));
      if (currentUser.role === 'SUPER_ADMIN') {
        setCurrentRole('ADMIN');
      } else if (currentUser.role === 'AGENT' && currentUser.agent) {
        setCurrentRole('AGENT');
        setCurrentAgent(currentUser.agent);
      }
    } else {
      localStorage.removeItem('bingo_session_user');
    }
  }, [currentUser]);

  const loadInitialAppData = async () => {
    try {
      const [cardsRes, agentsRes, syncRes] = await Promise.all([
        api.getCards(),
        api.getAgents(),
        api.getSyncStatus(),
      ]);

      if (cardsRes.success) setCards(cardsRes.cards);
      if (agentsRes.success && agentsRes.agents.length > 0) {
        setAgents(agentsRes.agents);
        if (!currentAgent) {
          setCurrentAgent(agentsRes.agents[0]);
        } else {
          const updated = agentsRes.agents.find((a) => a.agentId === currentAgent.agentId);
          if (updated) setCurrentAgent(updated);
        }
      }
      if (syncRes.success) {
        setPendingSyncCount(syncRes.pendingCount);
        setNetworkMode(syncRes.networkMode);
      }
    } catch (err) {
      console.error('Error initializing application:', err);
    }
  };

  const handleRefreshAgents = async () => {
    try {
      const res = await api.getAgents();
      if (res.success) {
        setAgents(res.agents);
        if (currentAgent) {
          const updated = res.agents.find((a) => a.agentId === currentAgent.agentId);
          if (updated) setCurrentAgent(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeNetworkMode = async (mode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE') => {
    setNetworkMode(mode);
    try {
      await api.setNetworkMode(mode);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerSync = async () => {
    if (networkMode === 'OFFLINE') {
      setSyncFeedback({
        message: 'Cannot sync while offline. Switch network mode to Online first.',
        type: 'error',
      });
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await api.syncNow(currentAgent?.agentId);
      if (res.success) {
        setSyncFeedback({
          message: res.centralServerMessage || 'Sync completed successfully with Central Atlas!',
          type: 'success',
        });
        loadInitialAppData();
      } else {
        setSyncFeedback({
          message: res.centralServerMessage || 'Sync failed',
          type: 'error',
        });
      }
    } catch (e: any) {
      setSyncFeedback({
        message: e.message || 'Error communicating with sync service',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'SUPER_ADMIN') {
      setCurrentRole('ADMIN');
    } else if (user.role === 'AGENT' && user.agent) {
      setCurrentRole('AGENT');
      setCurrentAgent(user.agent);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // If not logged in, show the clean username/password login screen
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isNight
          ? 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950'
          : 'bg-white text-slate-900 selection:bg-emerald-500 selection:text-white'
      }`}
    >
      {/* Global Application Header */}
      <Header
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        currentAgent={currentAgent}
        onSelectAgent={setCurrentAgent}
        agents={agents}
        networkMode={networkMode}
        onChangeNetworkMode={handleChangeNetworkMode}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onOpenElectronInfo={() => setIsElectronModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Sync Feedback Notification Banner */}
        {syncFeedback && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-fadeIn ${
              syncFeedback.type === 'success'
                ? isNight
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : isNight
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className="font-medium">{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Switcher based on Active Role */}
        {currentRole === 'ADMIN' && (
          <AdminView
            cards={cards}
            agents={agents}
            onRefreshData={loadInitialAppData}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
          />
        )}

        {currentRole === 'AGENT' && (
          <AgentView
            currentAgent={currentAgent}
            cards={cards}
            onStartGame={() => setCurrentRole('CALLER')}
            onRefreshData={loadInitialAppData}
            onTriggerSync={handleTriggerSync}
            isSyncing={isSyncing}
            networkMode={networkMode}
          />
        )}

        {currentRole === 'CALLER' && (
          <CallerView
            currentAgent={currentAgent}
            onRefreshAgent={handleRefreshAgents}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
          />
        )}
      </main>

      {/* Global System Footer */}
      <footer
        className={`border-t text-xs py-3 px-4 mt-8 transition-colors ${
          isNight
            ? 'bg-slate-900 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{t('footerText')}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsElectronModalOpen(true)}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('desktopDocs')}</span>
            </button>

            {currentRole !== 'AGENT' && (
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('printPhysicalCards')}</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        cards={cards}
      />

      <ElectronInfoModal
        isOpen={isElectronModalOpen}
        onClose={() => setIsElectronModalOpen(false)}
      />
    </div>
  );
}
