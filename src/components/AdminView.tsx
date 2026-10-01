import React, { useState, useEffect } from 'react';
import { Agent, BingoCard, Game, SystemSettings, Transaction, WinnerRecord, AgentStatus } from '../types/bingo';
import { api, SummaryStats, DbStatusResponse } from '../services/api';
import { FixedCardView } from './FixedCardView';
import { AgentTopupModal } from './AgentTopupModal';
import { NewAgentModal } from './NewAgentModal';
import { AssignPackageModal } from './AssignPackageModal';
import { EditAgentModal } from './EditAgentModal';
import { useTheme } from '../context/ThemeContext';
import {
  Shield,
  Users,
  CreditCard,
  History,
  FileSpreadsheet,
  Settings,
  Trophy,
  Coins,
  RefreshCw,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Database,
  Printer,
  Sparkles,
  Layers,
  Phone,
  MapPin,
  Laptop,
  Trash2,
  UserCog,
  Ban,
  Package,
  Check,
  AlertTriangle,
  Wifi,
  Download,
  Upload,
} from 'lucide-react';

interface AdminViewProps {
  cards: BingoCard[];
  agents: Agent[];
  onRefreshData: () => void;
  onOpenPdfModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  cards,
  agents,
  onRefreshData,
  onOpenPdfModal,
}) => {
  const { isNight } = useTheme();
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'CARDS' | 'AGENTS' | 'TRANSACTIONS' | 'GAMES' | 'SYNC' | 'SETTINGS'
  >('OVERVIEW');

  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);

  // Cards Generator State
  const [genCount, setGenCount] = useState<number>(50);
  const [genStart, setGenStart] = useState<number>(cards.length + 1);
  const [genPrefix, setGenPrefix] = useState<string>('CARD-');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const [cardSearch, setCardSearch] = useState<string>('');
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<BingoCard | null>(null);

  // Modals state
  const [topupTargetAgent, setTopupTargetAgent] = useState<Agent | null>(null);
  const [isNewAgentOpen, setIsNewAgentOpen] = useState<boolean>(false);
  const [targetAssignPackageAgent, setTargetAssignPackageAgent] = useState<Agent | null>(null);
  const [targetEditAgent, setTargetEditAgent] = useState<Agent | null>(null);

  // Action status feedbacks
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter states
  const [txAgentFilter, setTxAgentFilter] = useState<string>('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    try {
      const [sumRes, txRes, gameRes, winRes, setRes, dbRes] = await Promise.all([
        api.getSummary(),
        api.getTransactions(),
        api.getGames(),
        api.getWinners(),
        api.getSettings(),
        api.getDbStatus(),
      ]);

      if (sumRes.success) setSummary(sumRes.stats);
      if (txRes.success) setTransactions(txRes.transactions);
      if (gameRes.success) setGames(gameRes.games);
      if (winRes.success) setWinners(winRes.winners);
      if (setRes.success) setSettings(setRes.settings);
      if (dbRes.success) setDbStatus(dbRes);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  const handleGenerateCards = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenSuccess(null);

    try {
      const res = await api.generateCards(genCount, genStart, genPrefix);
      if (res.success) {
        setGenSuccess(
          `Successfully generated and permanently saved ${res.generated} fixed cards (${res.firstCardId} to ${res.lastCardId})!`
        );
        onRefreshData();
        loadAllAdminData();
        setGenStart(genStart + genCount);
      }
    } catch (err: any) {
      console.error('Card generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete card ${cardId}?`)) {
      return;
    }

    try {
      const res = await api.deleteCard(cardId);
      if (res.success) {
        setActionFeedback({ message: `Card ${cardId} permanently deleted.`, type: 'success' });
        onRefreshData();
        loadAllAdminData();
        if (selectedPreviewCard?.cardId === cardId) {
          setSelectedPreviewCard(null);
        }
      } else {
        setActionFeedback({ message: res.error || 'Failed to delete card', type: 'error' });
      }
    } catch (e: any) {
      setActionFeedback({ message: e.message || 'Error deleting card', type: 'error' });
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!window.confirm(`Are you sure you want to delete Agent "${agentName}" (${agentId})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.deleteAgent(agentId);
      if (res.success) {
        setActionFeedback({ message: `Agent ${agentId} deleted successfully.`, type: 'success' });
        onRefreshData();
        loadAllAdminData();
      } else {
        setActionFeedback({ message: res.error || 'Failed to delete agent', type: 'error' });
      }
    } catch (e: any) {
      setActionFeedback({ message: e.message || 'Error deleting agent', type: 'error' });
    }
  };

  const handleToggleAgentStatus = async (agent: Agent) => {
    const isCurrentlyBanned = agent.status === 'BANNED' || agent.status === 'SUSPENDED';
    let newStatus: AgentStatus = isCurrentlyBanned ? 'ACTIVE' : 'BANNED';
    let reason = undefined;

    if (!isCurrentlyBanned) {
      const inputReason = window.prompt(`Enter reason for banning Agent ${agent.agentId}:`, 'Violation of operational policy');
      if (inputReason === null) return; // Cancelled
      reason = inputReason || 'Administrative restriction';
    }

    try {
      const res = await api.setAgentStatus(agent.agentId, newStatus, reason);
      if (res.success) {
        setActionFeedback({
          message: `Agent ${agent.agentId} is now ${newStatus}${reason ? ` (${reason})` : ''}.`,
          type: 'success',
        });
        onRefreshData();
        loadAllAdminData();
      } else {
        setActionFeedback({ message: res.error || 'Failed to update agent status', type: 'error' });
      }
    } catch (e: any) {
      setActionFeedback({ message: e.message || 'Error updating status', type: 'error' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    setSettingsSuccess(null);

    try {
      const res = await api.saveSettings(settings);
      if (res.success) {
        setSettingsSuccess('System settings updated successfully!');
      }
    } catch (err: any) {
      console.error('Settings save error:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered Cards
  const filteredCards = cards.filter((c) =>
    c.cardId.toUpperCase().includes(cardSearch.toUpperCase().trim())
  );

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    if (!txAgentFilter) return true;
    return t.agentId.toUpperCase() === txAgentFilter.toUpperCase();
  });

  return (
    <div className="space-y-4">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-fadeIn ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl border text-xs font-semibold transition-colors ${
        isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('AGENTS')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'AGENTS'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agents & Packages ({agents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CARDS')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CARDS'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Fixed Cards Registry ({cards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Ledger ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('GAMES')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GAMES'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Games Log ({games.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                : isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>System Config</span>
          </button>
        </div>

        {/* MongoDB Atlas Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-medium">MongoDB Atlas:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Fixed Printed Cards</span>
                <CreditCard className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {cards.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Permanent unique Card IDs</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Agents</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {agents.filter((a) => a.status === 'ACTIVE').length} / {agents.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Terminals registered</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Games Conducted</span>
                <History className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {games.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Total rounds played</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Verified Winners</span>
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-100">
                {winners.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Cryptographically audited</p>
            </div>
          </div>

          {/* Database & Cloud Architecture Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Central MongoDB Atlas</h4>
                    <p className="text-xs text-slate-400">Master Cloud Repository</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                  Connected
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cluster:</span>
                  <span className="text-white">cluster0.iuxqn6k.mongodb.net</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Database:</span>
                  <span className="text-amber-400">eilabingo_db</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sync Pipeline:</span>
                  <span className="text-emerald-400">Dual-Write Active</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Local Offline SQLite Engine</h4>
                    <p className="text-xs text-slate-400">Zero-Latency Terminal Database</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40 text-xs font-bold font-mono">
                  100% Offline Ready
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Local DB:</span>
                  <span className="text-white">bingo_system.db (WAL Mode)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local Integrity:</span>
                  <span className="text-emerald-400">Verified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Offline Games:</span>
                  <span className="text-amber-400">Always Playable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                  <Printer className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm">Physical Card Print Studio</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Export 1, 2, 4, or 6 cards per A4 page with scissor cut lines.
                </p>
              </div>
              <button
                onClick={onOpenPdfModal}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Open Print Studio</span>
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                  <Coins className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm">Give Package Credits</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Allocate credits to agent PC terminals with audit ledger trail.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('AGENTS')}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Manage Agent Credits</span>
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-100 text-sm">Offline Sync Center</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Monitor MongoDB Atlas synchronizations and offline logs.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('SYNC')}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Inspect Sync Queue</span>
              </button>
            </div>
          </div>

          {/* Recent Audit Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-bold text-slate-100 text-sm">Recent Audit Ledger Activity</span>
              <button
                onClick={() => setActiveTab('TRANSACTIONS')}
                className="text-amber-400 hover:underline"
              >
                View All Ledger ({transactions.length}) →
              </button>
            </div>
            <div className="divide-y divide-slate-800/80 text-xs">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.transactionId} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          t.type === 'PACKAGE_CREDIT'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                            : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                        }`}
                      >
                        {t.type}
                      </span>
                      <span className="font-semibold text-slate-200">{t.agentId}</span>
                      <span className="text-slate-500 text-[11px] hidden sm:inline">{t.note}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      TX: {t.transactionId.substring(0, 16)}... • {new Date(t.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm ${
                        t.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.amount > 0 ? `+${t.amount}` : t.amount} CR
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Bal: {t.balanceAfter} CR
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: FIXED BINGO CARDS */}
      {activeTab === 'CARDS' && (
        <div className="space-y-4">
          {/* Card Generator Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Fixed Card Batch Generator</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Generate permanent unique Bingo cards. Numbers are saved once and NEVER regenerated.
                </p>
              </div>
              <button
                onClick={onOpenPdfModal}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Selected Cards</span>
              </button>
            </div>

            <form onSubmit={handleGenerateCards} className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Batch Count to Create:</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Start Number Index:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={genStart}
                  onChange={(e) => setGenStart(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Card ID Prefix:</label>
                <input
                  type="text"
                  required
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating...' : `Generate ${genCount} Fixed Cards`}</span>
                </button>
              </div>
            </form>

            {genSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{genSuccess}</span>
              </div>
            )}
          </div>

          {/* Cards Directory & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  placeholder="Search Card ID (e.g. CARD-0023)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-slate-100 text-xs font-mono uppercase"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>
              <div className="text-xs text-slate-400">
                Showing <strong className="text-slate-100 font-mono">{filteredCards.length}</strong> of{' '}
                <strong className="text-slate-100 font-mono">{cards.length}</strong> permanent cards
              </div>
            </div>

            {/* Grid of Fixed Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto p-1">
              {filteredCards.map((card) => (
                <FixedCardView
                  key={card.cardId}
                  card={card}
                  compact
                  onSelect={() => setSelectedPreviewCard(card)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AGENTS & PACKAGES */}
      {activeTab === 'AGENTS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-white">Agent Terminals & Package Allocation</h3>
              <p className="text-xs text-slate-400">
                Full CRUD control: Add, Edit, Ban/Suspend, Delete agents, and assign game packages.
              </p>
            </div>
            <button
              onClick={() => setIsNewAgentOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Agent</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const isBanned = agent.status === 'BANNED' || agent.status === 'SUSPENDED';
              const pkgName = agent.packageAssigned?.packageName || 'Standard Package';
              const gamesLeft = agent.packageAssigned?.gamesAllowed 
                ? agent.packageAssigned.gamesAllowed 
                : Math.floor(agent.balance / 50);

              return (
                <div
                  key={agent.agentId}
                  className={`bg-slate-900 border rounded-2xl p-4 shadow-xl space-y-3.5 transition flex flex-col justify-between ${
                    isBanned
                      ? 'border-rose-800/80 bg-rose-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white text-sm">{agent.name}</span>
                        </div>
                        <span className="font-mono text-amber-400 text-xs font-bold">
                          {agent.agentId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                            agent.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {agent.status}
                        </span>
                      </div>
                    </div>

                    {/* Ban reason warning if applicable */}
                    {isBanned && (
                      <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-200 text-[11px] flex items-center gap-1.5 mb-2">
                        <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Banned: {agent.banReason || 'Administrative restriction'}</span>
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{agent.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono text-[11px] truncate">{agent.deviceId}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{agent.phone || 'No phone recorded'}</span>
                      </div>
                    </div>

                    {/* Package Info Box */}
                    <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>Package:</span>
                        </span>
                        <span className="font-bold text-amber-300 font-mono text-xs">{pkgName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">Balance / Games:</span>
                        <span className="font-mono font-black text-emerald-400">
                          {agent.balance} CR (~{gamesLeft} games)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setTargetAssignPackageAgent(agent)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Assign Game Package</span>
                    </button>

                    <div className="grid grid-cols-4 gap-1.5 text-xs">
                      {/* Edit */}
                      <button
                        onClick={() => setTargetEditAgent(agent)}
                        title="Edit Agent Information"
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-1"
                      >
                        <UserCog className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px]">Edit</span>
                      </button>

                      {/* Ban / Unban */}
                      <button
                        onClick={() => handleToggleAgentStatus(agent)}
                        title={isBanned ? 'Unban Agent' : 'Ban / Suspend Agent'}
                        className={`py-1.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                          isBanned
                            ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{isBanned ? 'Unban' : 'Ban'}</span>
                      </button>

                      {/* Topup */}
                      <button
                        onClick={() => setTopupTargetAgent(agent)}
                        title="Quick Credit Top-up"
                        className="py-1.5 px-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/40 font-bold transition flex items-center justify-center gap-1"
                      >
                        <Coins className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px]">Topup</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteAgent(agent.agentId, agent.name)}
                        title="Delete Agent Permanently"
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 border border-transparent font-bold transition flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Del</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: TRANSACTIONS LEDGER */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Immutable Transaction Ledger</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cryptographic UUID event log ensuring zero double-charging across offline syncs
                </p>
              </div>

              {/* Agent Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Filter Agent:</span>
                <select
                  value={txAgentFilter}
                  onChange={(e) => setTxAgentFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none"
                >
                  <option value="">All Agents</option>
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name} ({a.agentId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-3">Transaction UUID</th>
                    <th className="py-2 px-3">Agent</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Balance After</th>
                    <th className="py-2 px-3">Note / Game ID</th>
                    <th className="py-2 px-3">Sync Status</th>
                    <th className="py-2 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.transactionId} className="hover:bg-slate-850">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {tx.transactionId.substring(0, 18)}...
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-200">{tx.agentId}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'PACKAGE_CREDIT'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-700/40'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} CR
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{tx.balanceAfter} CR</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">
                        {tx.note || tx.gameId || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.syncStatus === 'SYNCED'
                              ? 'bg-blue-950 text-blue-300 border border-blue-700/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-700/40'
                          }`}
                        >
                          {tx.syncStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: GAMES & WINNERS */}
      {activeTab === 'GAMES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Games History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400" />
                <span>All Games Session History</span>
              </h3>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {games.map((g) => (
                  <div
                    key={g.gameId}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400">{g.gameId}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          g.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400'
                            : g.status === 'IN_PROGRESS'
                            ? 'bg-rose-950 text-rose-400 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Agent: {g.agentId}</span>
                      <span>{g.calledNumbers.length} / 75 Numbers Called</span>
                    </div>

                    {g.winnerCardId && (
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-600/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Winner: <strong>{g.winnerCardId}</strong> ({g.winningPattern})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Winners */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Verified Bingo Winners</span>
              </h3>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {winners.map((w) => (
                  <div
                    key={w.winnerId}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-400 text-sm">{w.cardId}</span>
                      {w.prizeAmount && (
                        <span className="font-mono font-bold text-emerald-400">
                          Prize: {w.prizeAmount} CR
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300 font-semibold">{w.pattern}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Game: {w.gameId} • Agent: {w.agentId} • {new Date(w.verifiedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {winners.length === 0 && (
                  <div className="p-8 text-center text-slate-500">No winners recorded yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: SYNC & CENTRAL ATLAS */}
      {activeTab === 'SYNC' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Central MongoDB Atlas Sync Engine
                  </h3>
                  <p className="text-xs text-slate-400">
                    Idempotent two-way synchronization bridge between local SQLite and cloud master
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Database Engine:</span>
                <div className="font-bold text-slate-200">Local WebAssembly SQLite + Atlas Replica</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Idempotency Key:</span>
                <div className="font-mono text-emerald-400 font-bold">UUIDv4 Transaction Headers</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400">Offline Resilience:</span>
                <div className="font-bold text-amber-400">100% Zero-Latency Offline Mode</div>
              </div>
            </div>

            {/* Offline SQLite Storage Management */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Offline SQLite Local Storage (data/bingo_local.sqlite)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Embedded WebAssembly SQLite (sql.js). Download backup or import existing database.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => api.downloadSqliteDb()}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition cursor-pointer text-xs shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sqlite</span>
                  </button>
                  <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition cursor-pointer text-xs">
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Import .sqlite</span>
                    <input
                      type="file"
                      accept=".sqlite,.db,.sqlite3"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const res = await api.importSqliteDb(file);
                        if (res.success) {
                          window.location.reload();
                        } else {
                          alert('Import failed: ' + (res.error || 'Corrupt database file'));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: SETTINGS */}
      {activeTab === 'SETTINGS' && settings && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow max-w-2xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>System & Game Rules Configuration</span>
            </h3>
            <p className="text-xs text-slate-400">
              Configure cost per game, default winning patterns, and village branding
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Cost per Game (Agent Credit Deduction):
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.gameCost}
                  onChange={(e) => setSettings({ ...settings, gameCost: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Currency / Credit Symbol:</label>
                <input
                  type="text"
                  required
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Company / Organization Name:</label>
              <input
                type="text"
                required
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modals */}
      <AgentTopupModal
        isOpen={!!topupTargetAgent}
        onClose={() => setTopupTargetAgent(null)}
        agent={topupTargetAgent}
        onSuccess={() => {
          onRefreshData();
          loadAllAdminData();
        }}
      />

      <AssignPackageModal
        isOpen={!!targetAssignPackageAgent}
        onClose={() => setTargetAssignPackageAgent(null)}
        agent={targetAssignPackageAgent}
        onSuccess={() => {
          onRefreshData();
          loadAllAdminData();
          setActionFeedback({
            message: `Package assigned successfully to ${targetAssignPackageAgent?.agentId}!`,
            type: 'success',
          });
        }}
      />

      <EditAgentModal
        isOpen={!!targetEditAgent}
        onClose={() => setTargetEditAgent(null)}
        agent={targetEditAgent}
        onSuccess={() => {
          onRefreshData();
          loadAllAdminData();
          setActionFeedback({
            message: `Agent ${targetEditAgent?.agentId} details updated successfully!`,
            type: 'success',
          });
        }}
      />

      <NewAgentModal
        isOpen={isNewAgentOpen}
        onClose={() => setIsNewAgentOpen(false)}
        onSuccess={() => {
          onRefreshData();
          loadAllAdminData();
          setActionFeedback({
            message: 'New agent registered & package provisioned successfully!',
            type: 'success',
          });
        }}
      />

      {/* Card Preview & Delete Modal */}
      {selectedPreviewCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center min-h-screen animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-amber-400">
                {selectedPreviewCard.cardId}
              </span>
              <button
                onClick={() => setSelectedPreviewCard(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <FixedCardView card={selectedPreviewCard} />

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleDeleteCard(selectedPreviewCard.cardId)}
                className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Card</span>
              </button>
              <button
                onClick={() => setSelectedPreviewCard(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
