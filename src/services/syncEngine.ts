import { Network } from '@capacitor/network';
import { getDb } from './sqlite';
import { getSyncQueue, markSyncedItems, getAllAgents } from './database';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  syncedRecordIds: string[];
  centralServerMessage: string;
  timestamp: string;
  networkLatencyMs: number;
  agentUpdates: { agentId: string; newBalance: number }[];
}

class ClientSyncManager {
  private isOnline: boolean = true;
  private networkMode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE' = 'ONLINE';
  private cloudApiUrl: string = '';
  private listeners: Array<(status: { isOnline: boolean; networkMode: string }) => void> = [];

  constructor() {
    this.initNetworkListener();
  }

  private async initNetworkListener(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      if (!status.connected) {
        this.networkMode = 'OFFLINE';
      }

      Network.addListener('networkStatusChange', (status) => {
        this.isOnline = status.connected;
        if (!status.connected) {
          this.networkMode = 'OFFLINE';
        } else if (this.networkMode === 'OFFLINE') {
          this.networkMode = 'ONLINE';
        }
        this.notifyListeners();
        if (status.connected) {
          this.autoSyncOnReconnect();
        }
      });
    } catch (e) {
      console.warn('Network plugin not available, running in offline-only mode');
    }
  }

  setCloudApiUrl(url: string) {
    this.cloudApiUrl = url;
  }

  setNetworkMode(mode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE') {
    this.networkMode = mode;
    this.isOnline = mode !== 'OFFLINE';
    this.notifyListeners();
  }

  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      networkMode: this.networkMode,
      atlasConnected: this.isOnline && this.networkMode !== 'OFFLINE',
    };
  }

  onNetworkChange(listener: (status: { isOnline: boolean; networkMode: string }) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const status = { isOnline: this.isOnline, networkMode: this.networkMode };
    this.listeners.forEach((l) => l(status));
  }

  private async autoSyncOnReconnect(): Promise<void> {
    if (this.networkMode === 'OFFLINE' || !this.cloudApiUrl) return;
    try {
      await this.performIdempotentSync();
    } catch (e) {
      console.warn('Auto-sync on reconnect failed:', e);
    }
  }

  async performIdempotentSync(agentId?: string): Promise<SyncResult> {
    const timestamp = new Date().toISOString();

    if (this.networkMode === 'OFFLINE') {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        syncedRecordIds: [],
        centralServerMessage: 'Cannot synchronize: Device is currently in OFFLINE mode.',
        timestamp,
        networkLatencyMs: 0,
        agentUpdates: [],
      };
    }

    if (!this.cloudApiUrl) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        syncedRecordIds: [],
        centralServerMessage: 'Cloud API URL not configured. Set the sync server URL in Settings.',
        timestamp,
        networkLatencyMs: 0,
        agentUpdates: [],
      };
    }

    const latency = this.networkMode === 'SLOW_2G' ? 1200 : 250;
    await new Promise((resolve) => setTimeout(resolve, latency));

    const queue = await getSyncQueue();
    const relevantItems = agentId
      ? queue.filter((item) => item.payload?.agentId === agentId)
      : queue;

    const syncedRecordIds: string[] = [];
    const failedRecordIds: string[] = [];

    for (const item of relevantItems) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/api/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordType: item.recordType,
            recordId: item.recordId,
            payload: item.payload,
          }),
        });

        if (response.ok) {
          syncedRecordIds.push(item.recordId);
        } else {
          failedRecordIds.push(item.recordId);
        }
      } catch (err) {
        failedRecordIds.push(item.recordId);
      }
    }

    await markSyncedItems(syncedRecordIds);

    const allAgents = await getAllAgents();
    const agentUpdates = allAgents.map((a) => ({
      agentId: a.agentId,
      newBalance: a.balance,
    }));

    return {
      success: true,
      syncedCount: syncedRecordIds.length,
      failedCount: failedRecordIds.length,
      syncedRecordIds,
      centralServerMessage: syncedRecordIds.length > 0
        ? `Successfully synchronized ${syncedRecordIds.length} records with Central Atlas.`
        : 'No pending records to synchronize.',
      timestamp,
      networkLatencyMs: latency,
      agentUpdates,
    };
  }
}

export const syncManager = new ClientSyncManager();
