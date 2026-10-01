import { getSyncQueue, markSyncedItems, getAllAgents, adjustAgentCredit, getDb, saveDbToDisk } from './db';
import { SyncQueueItem } from '../src/types/bingo';

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

export class OfflineSyncManager {
  private isOnline: boolean = true;
  private networkMode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE' = 'ONLINE';

  public setNetworkMode(mode: 'ONLINE' | 'SLOW_2G' | 'OFFLINE') {
    this.networkMode = mode;
    this.isOnline = mode !== 'OFFLINE';
  }

  public getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      networkMode: this.networkMode,
      atlasConnected: this.isOnline,
    };
  }

  public async performIdempotentSync(agentId?: string): Promise<SyncResult> {
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

    const latency = this.networkMode === 'SLOW_2G' ? 1200 : 250;
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, latency));

    const queue = await getSyncQueue();
    const relevantItems = agentId
      ? queue.filter((item) => {
          if (item.payload?.agentId) {
            return item.payload.agentId === agentId;
          }
          return true;
        })
      : queue;

    const syncedRecordIds: string[] = [];
    const failedRecordIds: string[] = [];

    // Central Server Idempotent Ledger Simulator (MongoDB Atlas Replica)
    for (const item of relevantItems) {
      try {
        // Idempotency: each item.recordId is a unique UUID
        // The central server stores a unique index on recordId.
        // If already recorded, it simply returns HTTP 200 OK without re-applying.
        syncedRecordIds.push(item.recordId);
      } catch (err) {
        failedRecordIds.push(item.recordId);
      }
    }

    // Mark synced in local SQLite
    await markSyncedItems(syncedRecordIds);

    // Update Agent's lastSync timestamp
    if (agentId) {
      const db = await getDb();
      db.run('UPDATE agents SET lastSync = ? WHERE agentId = ?', [timestamp, agentId]);
      saveDbToDisk();
    }

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
      centralServerMessage: `Successfully synchronized ${syncedRecordIds.length} records with Central MongoDB Atlas.`,
      timestamp,
      networkLatencyMs: latency,
      agentUpdates,
    };
  }
}

export const syncManager = new OfflineSyncManager();
