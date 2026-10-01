import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteDBConnection, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;
let initialized = false;

export async function initDatabase(): Promise<SQLiteDBConnection> {
  if (db && initialized) return db;

  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    await customElements.whenDefined('jeep-sqlite');
    const jeepSqliteEl = document.querySelector('jeep-sqlite');
    if (jeepSqliteEl) {
      await sqlite.initWebStore();
    }
  }

  const ret = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection('bingo_db', false)).result;

  if (ret.result && isConn) {
    db = await sqlite.retrieveConnection('bingo_db', false);
  } else {
    db = await sqlite.createConnection('bingo_db', false, 'no-encryption', 1, false);
  }

  await db.open();
  await initSchema(db);
  initialized = true;
  return db;
}

export function getDb(): SQLiteDBConnection {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    initialized = false;
  }
}

async function initSchema(database: SQLiteDBConnection): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS agents (
      agentId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      phone TEXT,
      pin TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      deviceId TEXT NOT NULL,
      packageAssigned TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      banReason TEXT,
      createdAt TEXT NOT NULL,
      lastSync TEXT
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS devices (
      deviceId TEXT PRIMARY KEY,
      agentId TEXT,
      deviceName TEXT NOT NULL,
      appVersion TEXT NOT NULL,
      lastSync TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS bingo_cards (
      cardId TEXT PRIMARY KEY,
      bNumbers TEXT NOT NULL,
      iNumbers TEXT NOT NULL,
      nNumbers TEXT NOT NULL,
      gNumbers TEXT NOT NULL,
      oNumbers TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      createdAt TEXT NOT NULL
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS games (
      gameId TEXT PRIMARY KEY,
      agentId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      calledNumbers TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT,
      status TEXT NOT NULL,
      winnerCardId TEXT,
      winningPattern TEXT,
      gameCost REAL NOT NULL,
      createdAt TEXT NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING'
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS called_numbers (
      id TEXT PRIMARY KEY,
      gameId TEXT NOT NULL,
      number INTEGER NOT NULL,
      letter TEXT NOT NULL,
      callOrder INTEGER NOT NULL,
      calledAt TEXT NOT NULL
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS winners (
      winnerId TEXT PRIMARY KEY,
      gameId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      pattern TEXT NOT NULL,
      matchedNumbers TEXT NOT NULL,
      verifiedAt TEXT NOT NULL,
      prizeAmount REAL,
      prizeNotes TEXT,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING'
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      transactionId TEXT PRIMARY KEY,
      agentId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balanceAfter REAL NOT NULL,
      packageName TEXT,
      gameId TEXT,
      note TEXT,
      createdAt TEXT NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING'
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      syncId TEXT PRIMARY KEY,
      recordType TEXT NOT NULL,
      recordId TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retryCount INTEGER NOT NULL DEFAULT 0,
      lastAttempt TEXT,
      createdAt TEXT NOT NULL,
      error TEXT
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
}
