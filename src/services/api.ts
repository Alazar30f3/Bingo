import { Agent, BingoCard, Game, SystemSettings, Transaction, WinnerRecord, VerificationResult, AuthUser, AgentStatus, SyncQueueItem } from '../types/bingo';

const BASE = import.meta.env.VITE_API_URL || '';

async function http<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  return res.json();
}

export interface SyncStatusResponse {
  success: boolean;
  isOnline: boolean;
  networkMode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE';
  atlasConnected: boolean;
  pendingCount: number;
  queue: any[];
}

export interface SummaryStats {
  totalCards: number;
  totalAgents: number;
  totalGames: number;
  totalCompletedGames: number;
  totalWinners: number;
  totalCreditsIssued: number;
  totalCreditsSpent: number;
  totalCurrentAgentBalances: number;
  pendingSyncCount: number;
}

export interface DbStatusResponse {
  success: boolean;
  mongo?: {
    isConnected: boolean;
    error: string | null;
    uri: string;
    dbName: string;
    timestamp: string | null;
  };
  localSqlite?: {
    active: boolean;
    agentsCount: number;
    cardsCount: number;
    gamesCount: number;
  };
  error?: string;
}

export const api = {
  async login(payload: { role?: string; username?: string; password?: string; agentId?: string; pin?: string }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    return http('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  },

  async getDbStatus(): Promise<DbStatusResponse> {
    return http('/api/db/status');
  },

  async getCards(search?: string, limit?: number): Promise<{ success: boolean; count: number; cards: BingoCard[] }> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return http(`/api/cards${qs ? '?' + qs : ''}`);
  },

  async getCardById(cardId: string): Promise<{ success: boolean; card: BingoCard; error?: string }> {
    return http(`/api/cards/${encodeURIComponent(cardId)}`);
  },

  async generateCards(count: number, startNumber: number, prefix: string = 'CARD-'): Promise<{ success: boolean; generated?: number; firstCardId?: string; lastCardId?: string; count?: number; cards?: BingoCard[]; error?: string }> {
    return http('/api/cards/generate', { method: 'POST', body: JSON.stringify({ count, startNumber, prefix }) });
  },

  async deleteCard(cardId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return http(`/api/cards/${encodeURIComponent(cardId)}`, { method: 'DELETE' });
  },

  async getAgents(): Promise<{ success: boolean; agents: Agent[] }> {
    return http('/api/agents');
  },

  async getAgentById(agentId: string): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    return http(`/api/agents/${encodeURIComponent(agentId)}`);
  },

  async createAgent(data: Partial<Agent>): Promise<{ success: boolean; agent: Agent; error?: string }> {
    return http('/api/agents', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateAgent(agentId: string, data: Partial<Agent>): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    return http(`/api/agents/${encodeURIComponent(agentId)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteAgent(agentId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return http(`/api/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' });
  },

  async setAgentStatus(agentId: string, status: AgentStatus, banReason?: string): Promise<{ success: boolean; agent?: Agent; message?: string; error?: string }> {
    return http(`/api/agents/${encodeURIComponent(agentId)}/status`, { method: 'POST', body: JSON.stringify({ status, banReason }) });
  },

  async assignPackage(agentId: string, data: { packageName: string; credits: number; gamesAllowed: number; price?: number; note?: string }): Promise<{ success: boolean; agent?: Agent; transaction?: Transaction; message?: string; error?: string }> {
    return http(`/api/agents/${encodeURIComponent(agentId)}/package`, { method: 'POST', body: JSON.stringify(data) });
  },

  async topupAgent(agentId: string, amount: number, note?: string): Promise<{ success: boolean; agent?: Agent; transaction?: Transaction; newBalance?: number; error?: string }> {
    return http(`/api/agents/${encodeURIComponent(agentId)}/topup`, { method: 'POST', body: JSON.stringify({ amount, note }) });
  },

  async getGames(agentId?: string): Promise<{ success: boolean; games: Game[] }> {
    const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
    return http(`/api/games${qs}`);
  },

  async startGame(
    agentId: string,
    deviceId?: string,
    gamerCount?: number,
    capturedNumbers?: number[],
    capturedCards?: string[]
  ): Promise<{ success: boolean; game: Game; newAgentBalance: number; error?: string }> {
    return http('/api/games/start', {
      method: 'POST',
      body: JSON.stringify({ agentId, deviceId, gamerCount, capturedNumbers, capturedCards }),
    });
  },

  async updateGame(gameId: string, data: { calledNumbers?: number[]; status?: string; winnerCardId?: string; winningPattern?: string }): Promise<{ success: boolean; game?: Game; error?: string }> {
    return http(`/api/games/${encodeURIComponent(gameId)}/update`, { method: 'POST', body: JSON.stringify(data) });
  },

  async verifyCardInGame(gameId: string, cardId: string, calledNumbers: number[]): Promise<{ success: boolean; verification: VerificationResult; card: BingoCard; error?: string }> {
    return http(`/api/games/${encodeURIComponent(gameId)}/verify`, { method: 'POST', body: JSON.stringify({ cardId, calledNumbers }) });
  },

  async recordGameWinner(gameId: string, payload: { cardId: string; agentId: string; pattern: string; matchedNumbers: number[]; prizeAmount?: number; prizeNotes?: string }) {
    return http(`/api/games/${encodeURIComponent(gameId)}/winner`, { method: 'POST', body: JSON.stringify(payload) });
  },

  async getTransactions(agentId?: string): Promise<{ success: boolean; count: number; transactions: Transaction[] }> {
    const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
    return http(`/api/transactions${qs}`);
  },

  async getWinners(): Promise<{ success: boolean; winners: WinnerRecord[] }> {
    return http('/api/winners');
  },

  async getSummary(): Promise<{ success: boolean; stats: SummaryStats; recentTransactions: Transaction[]; recentGames: Game[] }> {
    return http('/api/reports/summary');
  },

  async getSettings(): Promise<{ success: boolean; settings: SystemSettings }> {
    return http('/api/settings');
  },

  async saveSettings(settings: SystemSettings) {
    return http('/api/settings', { method: 'POST', body: JSON.stringify(settings) });
  },

  async getSyncStatus(): Promise<SyncStatusResponse> {
    return http('/api/sync/status');
  },

  async syncNow(agentId?: string): Promise<{ success: boolean; syncedCount?: number; failedCount?: number; syncedRecordIds?: string[]; centralServerMessage?: string; timestamp?: string; networkLatencyMs?: number; agentUpdates?: { agentId: string; newBalance: number }[]; error?: string }> {
    return http('/api/sync/now', { method: 'POST', body: JSON.stringify({ agentId }) });
  },

  async setNetworkMode(mode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE') {
    return http('/api/sync/network-mode', { method: 'POST', body: JSON.stringify({ mode }) });
  },

  async getSqliteInfo(): Promise<{
    success: boolean;
    engine?: string;
    filename?: string;
    sizeBytes?: number;
    sizeFormatted?: string;
    lastModified?: string;
    isOfflineReady?: boolean;
    error?: string;
  }> {
    return http('/api/sqlite/info');
  },

  downloadSqliteDb() {
    window.open('/api/sqlite/download', '_blank');
  },

  async importSqliteDb(file: File): Promise<{ success: boolean; message?: string; error?: string }> {
    const buf = await file.arrayBuffer();
    const res = await fetch('/api/sqlite/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buf,
    });
    return res.json();
  },
};
