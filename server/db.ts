import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  BingoCard,
  Game,
  SystemSettings,
  Transaction,
  WinnerRecord,
  SyncQueueItem,
} from '../src/types/bingo';

const DATA_DIR = path.join(process.cwd(), 'data');
export const DB_FILE = path.join(DATA_DIR, 'bingo_local.sqlite');

let db: Database | null = null;
let SQL: any = null;

/**
 * ============================================================
 * FIXED BINGO CARD CONFIGURATION
 * ============================================================
 *
 * ONLY THESE 75 CARDS ARE ALLOWED:
 *
 * CARD-0001
 * CARD-0002
 * ...
 * CARD-0075
 *
 * The seed is fixed so the numbers NEVER change.
 */
const FIXED_CARD_COUNT = 75;
const FIXED_CARD_PREFIX = 'CARD-';
const FIXED_CARD_SEED = 753159;

/**
 * ============================================================
 * DETERMINISTIC RANDOM GENERATOR
 * ============================================================
 *
 * IMPORTANT:
 * DO NOT replace this with Math.random().
 *
 * The same seed always creates the same sequence.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ============================================================
 * SEEDED SHUFFLE
 * ============================================================
 */
function shuffleWithSeed<T>(
  items: T[],
  random: () => number
): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * ============================================================
 * CREATE THE ONLY 75 BINGO CARDS
 * ============================================================
 */
function createFixedBingoCards(): BingoCard[] {
  const random = createSeededRandom(FIXED_CARD_SEED);

  const cards: BingoCard[] = [];

  for (
    let cardNumber = 1;
    cardNumber <= FIXED_CARD_COUNT;
    cardNumber++
  ) {
    /**
     * B = 1 - 15
     */
    const bPool = Array.from(
      { length: 15 },
      (_, i) => i + 1
    );

    /**
     * I = 16 - 30
     */
    const iPool = Array.from(
      { length: 15 },
      (_, i) => i + 16
    );

    /**
     * N = 31 - 45
     */
    const nPool = Array.from(
      { length: 15 },
      (_, i) => i + 31
    );

    /**
     * G = 46 - 60
     */
    const gPool = Array.from(
      { length: 15 },
      (_, i) => i + 46
    );

    /**
     * O = 61 - 75
     */
    const oPool = Array.from(
      { length: 15 },
      (_, i) => i + 61
    );

    const bNumbers = shuffleWithSeed(
      bPool,
      random
    ).slice(0, 5);

    const iNumbers = shuffleWithSeed(
      iPool,
      random
    ).slice(0, 5);

    const nNumbers = shuffleWithSeed(
      nPool,
      random
    ).slice(0, 5);

    const gNumbers = shuffleWithSeed(
      gPool,
      random
    ).slice(0, 5);

    const oNumbers = shuffleWithSeed(
      oPool,
      random
    ).slice(0, 5);

    /**
     * Center of N column is FREE.
     *
     * 0 is used in the database representation.
     * The existing BingoCard type is preserved.
     */
    nNumbers[2] = 0 as any;

    const cardId =
      `${FIXED_CARD_PREFIX}${String(cardNumber).padStart(4, '0')}`;

    cards.push({
      cardId,
      bNumbers,
      iNumbers,
      nNumbers,
      gNumbers,
      oNumbers,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  }

  return cards;
}

/**
 * ============================================================
 * THE ONLY CARD SET USED BY THE SYSTEM
 * ============================================================
 */
const FIXED_BINGO_CARDS: BingoCard[] =
  createFixedBingoCards();

/**
 * ============================================================
 * ENSURE DATA DIRECTORY EXISTS
 * ============================================================
 */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * ============================================================
 * CARD COMPARISON HELPERS
 * ============================================================
 */

function normalizeCardNumbers(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Invalid JSON
    }
  }

  return [];
}

function cardNumbersEqual(
  actual: unknown,
  expected: unknown
): boolean {
  const actualArray = normalizeCardNumbers(actual);
  const expectedArray = normalizeCardNumbers(expected);

  if (actualArray.length !== expectedArray.length) {
    return false;
  }

  for (let i = 0; i < actualArray.length; i++) {
    if (actualArray[i] !== expectedArray[i]) {
      return false;
    }
  }

  return true;
}

/**
 * ============================================================
 * VERIFY WHETHER DATABASE HAS THE EXACT 75 CARDS
 * ============================================================
 */
function areFixedCardsCorrect(
  database: Database
): boolean {
  const result = database.exec(`
    SELECT
      cardId,
      bNumbers,
      iNumbers,
      nNumbers,
      gNumbers,
      oNumbers,
      status,
      createdAt
    FROM bingo_cards
    ORDER BY cardId ASC
  `);

  if (result.length === 0) {
    return false;
  }

  const rows = result[0].values;

  /**
   * Must contain EXACTLY 75 rows.
   */
  if (rows.length !== FIXED_CARD_COUNT) {
    return false;
  }

  const columns = result[0].columns;

  const storedCards = rows.map((row) => {
    const obj: any = {};

    columns.forEach((column, index) => {
      obj[column] = row[index];
    });

    return obj;
  });

  /**
   * Verify every single card.
   */
  for (
    let i = 0;
    i < FIXED_BINGO_CARDS.length;
    i++
  ) {
    const expected = FIXED_BINGO_CARDS[i];

    const actual = storedCards.find(
      (card) =>
        String(card.cardId).toUpperCase() ===
        expected.cardId.toUpperCase()
    );

    if (!actual) {
      return false;
    }

    if (
      !cardNumbersEqual(
        actual.bNumbers,
        expected.bNumbers
      )
    ) {
      return false;
    }

    if (
      !cardNumbersEqual(
        actual.iNumbers,
        expected.iNumbers
      )
    ) {
      return false;
    }

    if (
      !cardNumbersEqual(
        actual.nNumbers,
        expected.nNumbers
      )
    ) {
      return false;
    }

    if (
      !cardNumbersEqual(
        actual.gNumbers,
        expected.gNumbers
      )
    ) {
      return false;
    }

    if (
      !cardNumbersEqual(
        actual.oNumbers,
        expected.oNumbers
      )
    ) {
      return false;
    }

    if (String(actual.status) !== 'ACTIVE') {
      return false;
    }
  }

  return true;
}

/**
 * ============================================================
 * INSERT THE EXACT FIXED 75 CARDS
 * ============================================================
 */
function insertFixedCards(
  database: Database
): void {
  for (const card of FIXED_BINGO_CARDS) {
    database.run(
      `
      INSERT INTO bingo_cards
      (
        cardId,
        bNumbers,
        iNumbers,
        nNumbers,
        gNumbers,
        oNumbers,
        status,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        card.cardId,
        JSON.stringify(card.bNumbers),
        JSON.stringify(card.iNumbers),
        JSON.stringify(card.nNumbers),
        JSON.stringify(card.gNumbers),
        JSON.stringify(card.oNumbers),
        'ACTIVE',
        card.createdAt,
      ]
    );
  }
}

/**
 * ============================================================
 * ENSURE EXACTLY THE SAME 75 CARDS
 * ============================================================
 *
 * If:
 * - there are 0 cards
 * - there are 50 cards
 * - there are 76 cards
 * - card numbers were changed
 * - a card is missing
 * - a wrong card was inserted
 *
 * then ONLY bingo_cards is reset and the same fixed 75
 * cards are recreated.
 *
 * Other tables are NOT touched.
 */
function ensureFixedBingoCards(
  database: Database
): void {
  const correct = areFixedCardsCorrect(database);

  if (correct) {
    console.log(
      'Fixed bingo cards verified: CARD-0001 to CARD-0075 (75 cards)'
    );

    return;
  }

  const countResult = database.exec(
    'SELECT COUNT(*) as count FROM bingo_cards'
  );

  const currentCount =
    countResult.length > 0
      ? Number(countResult[0].values[0][0])
      : 0;

  console.log(
    `Resetting bingo cards: found ${currentCount}, expected ${FIXED_CARD_COUNT}`
  );

  /**
   * IMPORTANT:
   *
   * Only bingo_cards is deleted.
   *
   * Games
   * Agents
   * Transactions
   * Winners
   * Sync Queue
   *
   * are NOT deleted.
   */
  database.run(
    'DELETE FROM bingo_cards'
  );

  insertFixedCards(database);

  console.log(
    'Created fixed bingo cards: CARD-0001 to CARD-0075'
  );
}

/**
 * ============================================================
 * GET DATABASE
 * ============================================================
 */
export async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer =
        fs.readFileSync(DB_FILE);

      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error(
        'Error loading existing SQLite database file, initializing fresh:',
        e
      );

      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  initSchema(db);

  /**
   * IMPORTANT:
   * Always verify the fixed cards after schema initialization.
   */
  ensureFixedBingoCards(db);

  saveDbToDisk();

  return db;
}

/**
 * ============================================================
 * SAVE DATABASE
 * ============================================================
 */
export function saveDbToDisk() {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = Buffer.from(data);

    fs.writeFileSync(
      DB_FILE,
      buffer
    );
  } catch (err) {
    console.error(
      'Error saving SQLite DB to disk:',
      err
    );
  }
}

/**
 * ============================================================
 * DATABASE SCHEMA
 * ============================================================
 */
function initSchema(
  database: Database
) {
  // 1. Admins
  database.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // 2. Agents
  database.run(`
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

  // 3. Devices
  database.run(`
    CREATE TABLE IF NOT EXISTS devices (
      deviceId TEXT PRIMARY KEY,
      agentId TEXT,
      deviceName TEXT NOT NULL,
      appVersion TEXT NOT NULL,
      lastSync TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );
  `);

  // 4. BingoCards
  database.run(`
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

  // 5. Games
  database.run(`
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

  // 6. CalledNumbers
  database.run(`
    CREATE TABLE IF NOT EXISTS called_numbers (
      id TEXT PRIMARY KEY,
      gameId TEXT NOT NULL,
      number INTEGER NOT NULL,
      letter TEXT NOT NULL,
      callOrder INTEGER NOT NULL,
      calledAt TEXT NOT NULL
    );
  `);

  // 7. Winners
  database.run(`
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

  // 8. Transactions
  database.run(`
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

  // Safe migrations
  try {
    database.run(
      'ALTER TABLE transactions ADD COLUMN packageName TEXT;'
    );
  } catch (e) {
    // Column already exists
  }

  try {
    database.run(
      'ALTER TABLE agents ADD COLUMN packageAssigned TEXT;'
    );
  } catch (e) {
    // Column already exists
  }

  try {
    database.run(
      'ALTER TABLE agents ADD COLUMN banReason TEXT;'
    );
  } catch (e) {
    // Column already exists
  }

  // 9. SyncQueue
  database.run(`
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

  // 10. SystemSettings
  database.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Seed default admin
  const adminRes = database.exec(
    "SELECT COUNT(*) as count FROM admins WHERE username = 'admin'"
  );

  if (
    adminRes.length === 0 ||
    adminRes[0].values[0][0] === 0
  ) {
    const now =
      new Date().toISOString();

    database.run(
      `
      INSERT INTO admins
      (id, username, password, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        'ADMIN-001',
        'admin',
        'admin123',
        'Super Admin Master',
        'ADMIN',
        now,
      ]
    );
  }

  // Seed default agents
  const agentRes = database.exec(
    'SELECT COUNT(*) as count FROM agents'
  );

  if (
    agentRes.length === 0 ||
    agentRes[0].values[0][0] === 0
  ) {
    const now =
      new Date().toISOString();

    const defaultAgents: Agent[] = [
      {
        agentId: 'AGENT-101',
        name: 'Township Hall Operator',
        location: 'Pine Creek Community Center',
        phone: '+1 (555) 234-8901',
        pin: '1234',
        balance: 1500,
        deviceId: 'DEV-PC-001',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        agentId: 'AGENT-102',
        name: 'Oak Valley Recreation Agent',
        location: 'Oak Valley Senior Center',
        phone: '+1 (555) 456-7890',
        pin: '5678',
        balance: 850,
        deviceId: 'DEV-PC-002',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        agentId: 'AGENT-103',
        name: 'River Bend Club Agent',
        location: 'River Bend Hall',
        phone: '+1 (555) 678-1234',
        pin: '9900',
        balance: 2000,
        deviceId: 'DEV-PC-003',
        status: 'ACTIVE',
        createdAt: now,
      },
    ];

    for (const a of defaultAgents) {
      database.run(
        `
        INSERT INTO agents
        (
          agentId,
          name,
          location,
          phone,
          pin,
          balance,
          deviceId,
          status,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          a.agentId,
          a.name,
          a.location,
          a.phone,
          a.pin,
          a.balance,
          a.deviceId,
          a.status,
          a.createdAt,
        ]
      );

      const txId = uuidv4();

      database.run(
        `
        INSERT INTO transactions
        (
          transactionId,
          agentId,
          deviceId,
          type,
          amount,
          balanceAfter,
          note,
          createdAt,
          syncStatus
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          txId,
          a.agentId,
          a.deviceId,
          'PACKAGE_CREDIT',
          a.balance,
          a.balance,
          'Initial Seed Package Credit',
          now,
          'SYNCED',
        ]
      );
    }
  }

  /**
   * IMPORTANT:
   * Fixed cards are NOT seeded here.
   *
   * They are handled by ensureFixedBingoCards()
   * after schema creation.
   */

  // Seed default system settings
  const defaultSettings: SystemSettings = {
    gameCost: 50,
    companyName: 'EilaBingo Community Network',
    locationName: 'Offline District Ops',
    currencySymbol: 'CR',
    autoSyncIntervalSec: 300,
    voiceAnnounceEnabled: true,
    allowedPatterns: [
      'ANY_LINE',
      'HORIZONTAL_LINE',
      'VERTICAL_LINE',
      'DIAGONAL_LINE',
      'FOUR_CORNERS',
      'POSTAGE_STAMP',
      'PLUS_CROSS',
      'FULL_CARD_BLACKOUT',
    ],
    centralServerUrl:
      'https://central-bingo-atlas.internal/api/sync',
    centerFreeText: 'FREE',
  };

  const setRes = database.exec(
    "SELECT COUNT(*) as count FROM system_settings WHERE key = 'app_config'"
  );

  if (
    setRes.length === 0 ||
    setRes[0].values[0][0] === 0
  ) {
    database.run(
      `
      INSERT INTO system_settings
      (key, value, updatedAt)
      VALUES (?, ?, ?)
      `,
      [
        'app_config',
        JSON.stringify(defaultSettings),
        new Date().toISOString(),
      ]
    );
  }
}

/**
 * ============================================================
 * GET ALL CARDS
 * ============================================================
 */
export async function getAllCards(): Promise<BingoCard[]> {
  const database = await getDb();

  /**
   * Safety check:
   * Never return a database containing a wrong card set.
   */
  ensureFixedBingoCards(database);

  saveDbToDisk();

  const res = database.exec(
    'SELECT * FROM bingo_cards ORDER BY cardId ASC'
  );

  if (res.length === 0) {
    return [];
  }

  const columns = res[0].columns;

  return res[0].values.map((row) => {
    const obj: any = {};

    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      cardId: obj.cardId,
      bNumbers: JSON.parse(obj.bNumbers),
      iNumbers: JSON.parse(obj.iNumbers),
      nNumbers: JSON.parse(obj.nNumbers),
      gNumbers: JSON.parse(obj.gNumbers),
      oNumbers: JSON.parse(obj.oNumbers),
      status: obj.status,
      createdAt: obj.createdAt,
    };
  });
}

/**
 * ============================================================
 * GET CARD BY ID
 * ============================================================
 */
export async function getCardById(
  cardId: string
): Promise<BingoCard | null> {
  const database = await getDb();

  /**
   * Safety check.
   */
  ensureFixedBingoCards(database);

  const normalizedCardId =
    cardId.toUpperCase().trim();

  const res = database.exec(
    `
    SELECT *
    FROM bingo_cards
    WHERE UPPER(cardId) = '${normalizedCardId}'
    `
  );

  if (
    res.length === 0 ||
    res[0].values.length === 0
  ) {
    return null;
  }

  const columns = res[0].columns;
  const row = res[0].values[0];

  const obj: any = {};

  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });

  return {
    cardId: obj.cardId,
    bNumbers: JSON.parse(obj.bNumbers),
    iNumbers: JSON.parse(obj.iNumbers),
    nNumbers: JSON.parse(obj.nNumbers),
    gNumbers: JSON.parse(obj.gNumbers),
    oNumbers: JSON.parse(obj.oNumbers),
    status: obj.status,
    createdAt: obj.createdAt,
  };
}

/**
 * ============================================================
 * INSERT BATCH CARDS
 * ============================================================
 *
 * IMPORTANT:
 * Random/new card generation is NOT allowed anymore.
 *
 * This function only accepts the existing fixed 75 cards.
 */
export async function insertBatchCards(
  cards: BingoCard[]
): Promise<{
  inserted: number;
  duplicates: number;
}> {
  const database = await getDb();

  let inserted = 0;
  let duplicates = 0;

  for (const card of cards) {
    const expected = FIXED_BINGO_CARDS.find(
      (fixedCard) =>
        fixedCard.cardId.toUpperCase() ===
        card.cardId.toUpperCase()
    );

    /**
     * Reject any card that is not part of
     * CARD-0001 -> CARD-0075.
     */
    if (!expected) {
      console.warn(
        `Rejected non-fixed bingo card: ${card.cardId}`
      );

      duplicates++;
      continue;
    }

    /**
     * Only accept if its numbers exactly match
     * the permanent fixed card.
     */
    const valid =
      cardNumbersEqual(
        card.bNumbers,
        expected.bNumbers
      ) &&
      cardNumbersEqual(
        card.iNumbers,
        expected.iNumbers
      ) &&
      cardNumbersEqual(
        card.nNumbers,
        expected.nNumbers
      ) &&
      cardNumbersEqual(
        card.gNumbers,
        expected.gNumbers
      ) &&
      cardNumbersEqual(
        card.oNumbers,
        expected.oNumbers
      );

    if (!valid) {
      console.warn(
        `Rejected modified bingo card: ${card.cardId}`
      );

      duplicates++;
      continue;
    }

    try {
      database.run(
        `
        INSERT INTO bingo_cards
        (
          cardId,
          bNumbers,
          iNumbers,
          nNumbers,
          gNumbers,
          oNumbers,
          status,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          expected.cardId,
          JSON.stringify(expected.bNumbers),
          JSON.stringify(expected.iNumbers),
          JSON.stringify(expected.nNumbers),
          JSON.stringify(expected.gNumbers),
          JSON.stringify(expected.oNumbers),
          'ACTIVE',
          expected.createdAt,
        ]
      );

      inserted++;
    } catch (e) {
      duplicates++;
    }
  }

  /**
   * Always restore the complete fixed set.
   */
  ensureFixedBingoCards(database);

  saveDbToDisk();

  return {
    inserted,
    duplicates,
  };
}

/**
 * ============================================================
 * GET ALL AGENTS
 * ============================================================
 */
export async function getAllAgents(): Promise<Agent[]> {
  const database = await getDb();

  const res = database.exec(
    'SELECT * FROM agents ORDER BY agentId ASC'
  );

  if (res.length === 0) {
    return [];
  }

  const columns = res[0].columns;

  return res[0].values.map((row) => {
    const obj: any = {};

    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    let parsedPackage = undefined;

    if (obj.packageAssigned) {
      try {
        parsedPackage =
          JSON.parse(obj.packageAssigned);
      } catch (e) {}
    }

    return {
      agentId: obj.agentId,
      name: obj.name,
      username:
        obj.username || undefined,
      location: obj.location,
      phone: obj.phone,
      pin: obj.pin,
      balance: Number(obj.balance),
      packageAssigned: parsedPackage,
      deviceId: obj.deviceId,
      status: obj.status || 'ACTIVE',
      banReason:
        obj.banReason || undefined,
      createdAt: obj.createdAt,
      lastSync: obj.lastSync,
    };
  });
}

/**
 * ============================================================
 * GET AGENT BY ID
 * ============================================================
 */
export async function getAgentById(
  agentId: string
): Promise<Agent | null> {
  const database = await getDb();

  const res = database.exec(
    `
    SELECT *
    FROM agents
    WHERE UPPER(agentId) = '${agentId
      .toUpperCase()
      .trim()}'
    `
  );

  if (
    res.length === 0 ||
    res[0].values.length === 0
  ) {
    return null;
  }

  const columns = res[0].columns;
  const row = res[0].values[0];

  const obj: any = {};

  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });

  let parsedPackage = undefined;

  if (obj.packageAssigned) {
    try {
      parsedPackage =
        JSON.parse(obj.packageAssigned);
    } catch (e) {}
  }

  return {
    agentId: obj.agentId,
    name: obj.name,
    username:
      obj.username || undefined,
    location: obj.location,
    phone: obj.phone,
    pin: obj.pin,
    balance: Number(obj.balance),
    packageAssigned: parsedPackage,
    deviceId: obj.deviceId,
    status: obj.status || 'ACTIVE',
    banReason:
      obj.banReason || undefined,
    createdAt: obj.createdAt,
    lastSync: obj.lastSync,
  };
}

/**
 * ============================================================
 * CREATE AGENT
 * ============================================================
 */
export async function createAgent(
  agent: Agent
): Promise<Agent> {
  const database = await getDb();

  const packageStr =
    agent.packageAssigned
      ? JSON.stringify(agent.packageAssigned)
      : null;

  database.run(
    `
    INSERT OR REPLACE INTO agents
    (
      agentId,
      name,
      location,
      phone,
      pin,
      balance,
      deviceId,
      packageAssigned,
      status,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      agent.agentId,
      agent.name,
      agent.location,
      agent.phone,
      agent.pin,
      agent.balance,
      agent.deviceId,
      packageStr,
      agent.status || 'ACTIVE',
      agent.createdAt,
    ]
  );

  if (agent.balance > 0) {
    const txId = uuidv4();

    database.run(
      `
      INSERT INTO transactions
      (
        transactionId,
        agentId,
        deviceId,
        type,
        amount,
        balanceAfter,
        packageName,
        note,
        createdAt,
        syncStatus
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        txId,
        agent.agentId,
        agent.deviceId,
        'PACKAGE_CREDIT',
        agent.balance,
        agent.balance,
        agent.packageAssigned?.packageName ||
          'Initial Package',
        'Initial Agent Credit Allocation',
        agent.createdAt,
        'PENDING',
      ]
    );
  }

  saveDbToDisk();

  return agent;
}

/**
 * ============================================================
 * UPDATE AGENT
 * ============================================================
 */
export async function updateAgent(
  agentId: string,
  updates: Partial<Agent>
): Promise<Agent | null> {
  const database = await getDb();

  const current =
    await getAgentById(agentId);

  if (!current) {
    return null;
  }

  const updated: Agent = {
    ...current,
    ...updates,
  };

  database.run(
    `
    UPDATE agents
    SET
      name = ?,
      location = ?,
      phone = ?,
      pin = ?,
      deviceId = ?,
      status = ?
    WHERE UPPER(agentId) = ?
    `,
    [
      updated.name,
      updated.location,
      updated.phone,
      updated.pin,
      updated.deviceId,
      updated.status,
      agentId.toUpperCase(),
    ]
  );

  saveDbToDisk();

  return updated;
}

/**
 * ============================================================
 * DELETE AGENT
 * ============================================================
 */
export async function deleteAgent(
  agentId: string
): Promise<boolean> {
  const database = await getDb();

  database.run(
    `
    DELETE FROM agents
    WHERE UPPER(agentId) = ?
    `,
    [agentId.toUpperCase()]
  );

  saveDbToDisk();

  return true;
}

/**
 * ============================================================
 * SET AGENT STATUS
 * ============================================================
 */
export async function setAgentStatus(
  agentId: string,
  status:
    | 'ACTIVE'
    | 'BANNED'
    | 'SUSPENDED',
  banReason?: string
): Promise<Agent | null> {
  const database = await getDb();

  const current =
    await getAgentById(agentId);

  if (!current) {
    return null;
  }

  database.run(
    `
    UPDATE agents
    SET status = ?
    WHERE UPPER(agentId) = ?
    `,
    [
      status,
      agentId.toUpperCase(),
    ]
  );

  current.status = status;
  current.banReason = banReason;

  saveDbToDisk();

  return current;
}

/**
 * ============================================================
 * ASSIGN PACKAGE TO AGENT
 * ============================================================
 */
export async function assignPackageToAgent(
  agentId: string,
  assignment: {
    packageName: string;
    credits: number;
    gamesAllowed: number;
    costPerGame?: number;
    price?: number;
  },
  note?: string
): Promise<{
  success: boolean;
  agent: Agent;
  transaction: Transaction;
}> {
  const database = await getDb();

  const agent =
    await getAgentById(agentId);

  if (!agent) {
    throw new Error(
      `Agent ${agentId} not found`
    );
  }

  const costPerGame =
    assignment.costPerGame || 50;

  const newBalance =
    agent.balance +
    assignment.credits;

  const now =
    new Date().toISOString();

  const txId = uuidv4();

  const pkgAssignment = {
    packageName:
      assignment.packageName,
    credits:
      assignment.credits,
    gamesAllowed:
      assignment.gamesAllowed ||
      Math.floor(
        assignment.credits /
          costPerGame
      ),
    costPerGame,
    assignedAt: now,
    price: assignment.price,
  };

  database.run(
    `
    UPDATE agents
    SET
      balance = ?,
      packageAssigned = ?
    WHERE UPPER(agentId) = ?
    `,
    [
      newBalance,
      JSON.stringify(
        pkgAssignment
      ),
      agentId.toUpperCase(),
    ]
  );

  const transaction: Transaction = {
    transactionId: txId,
    agentId: agent.agentId,
    deviceId: agent.deviceId,
    type: 'PACKAGE_CREDIT',
    amount: assignment.credits,
    balanceAfter: newBalance,
    packageName:
      assignment.packageName,
    note:
      note ||
      `Package Assigned: ${assignment.packageName} (+${assignment.credits} CR for ${pkgAssignment.gamesAllowed} games)`,
    createdAt: now,
    syncStatus: 'PENDING',
  };

  database.run(
    `
    INSERT INTO transactions
    (
      transactionId,
      agentId,
      deviceId,
      type,
      amount,
      balanceAfter,
      packageName,
      note,
      createdAt,
      syncStatus
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      txId,
      agent.agentId,
      agent.deviceId,
      'PACKAGE_CREDIT',
      assignment.credits,
      newBalance,
      assignment.packageName,
      transaction.note,
      now,
      'PENDING',
    ]
  );

  database.run(
    `
    INSERT INTO sync_queue
    (
      syncId,
      recordType,
      recordId,
      payload,
      status,
      retryCount,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      'TRANSACTION',
      txId,
      JSON.stringify({
        transactionId: txId,
        agentId,
        deviceId:
          agent.deviceId,
        type:
          'PACKAGE_CREDIT',
        amount:
          assignment.credits,
        balanceAfter:
          newBalance,
        packageName:
          assignment.packageName,
        note:
          transaction.note,
        createdAt: now,
      }),
      'PENDING',
      0,
      now,
    ]
  );

  saveDbToDisk();

  const updatedAgent =
    await getAgentById(agentId);

  if (updatedAgent) {
    updatedAgent.packageAssigned =
      pkgAssignment;

    updatedAgent.balance =
      newBalance;
  }

  return {
    success: true,
    agent:
      updatedAgent || {
        ...agent,
        balance: newBalance,
        packageAssigned:
          pkgAssignment,
      },
    transaction,
  };
}

/**
 * ============================================================
 * DELETE CARD
 * ============================================================
 *
 * CARD-0001 -> CARD-0075 can NEVER be deleted.
 */
export async function deleteCard(
  cardId: string
): Promise<boolean> {
  const normalizedCardId =
    cardId.toUpperCase().trim();

  const match =
    normalizedCardId.match(
      /^CARD-(\d{4})$/
    );

  if (match) {
    const number =
      Number(match[1]);

    if (
      number >= 1 &&
      number <= FIXED_CARD_COUNT
    ) {
      throw new Error(
        `${normalizedCardId} is a permanent fixed bingo card and cannot be deleted.`
      );
    }
  }

  /**
   * Even if somebody tries to delete a
   * non-fixed card, the fixed set is restored.
   */
  const database = await getDb();

  database.run(
    `
    DELETE FROM bingo_cards
    WHERE UPPER(cardId) = ?
    `,
    [normalizedCardId]
  );

  ensureFixedBingoCards(database);

  saveDbToDisk();

  return true;
}

/**
 * ============================================================
 * ADJUST AGENT CREDIT
 * ============================================================
 */
export async function adjustAgentCredit(
  agentId: string,
  amount: number,
  type:
    | 'PACKAGE_CREDIT'
    | 'GAME_FEE'
    | 'REFUND'
    | 'ADJUSTMENT',
  note: string,
  gameId?: string,
  deviceId?: string
): Promise<{
  success: boolean;
  transaction: Transaction;
  newBalance: number;
}> {
  const database = await getDb();

  const agent =
    await getAgentById(agentId);

  if (!agent) {
    throw new Error(
      `Agent ${agentId} not found`
    );
  }

  const newBalance =
    agent.balance + amount;

  if (
    newBalance < 0 &&
    type === 'GAME_FEE'
  ) {
    throw new Error(
      `Insufficient credit. Required: ${Math.abs(
        amount
      )}, Current Balance: ${agent.balance}`
    );
  }

  const transactionId =
    uuidv4();

  const now =
    new Date().toISOString();

  const effDeviceId =
    deviceId ||
    agent.deviceId ||
    'DEV-PC-LOCAL';

  database.run(
    `
    UPDATE agents
    SET balance = ?
    WHERE agentId = ?
    `,
    [
      newBalance,
      agentId,
    ]
  );

  database.run(
    `
    INSERT INTO transactions
    (
      transactionId,
      agentId,
      deviceId,
      type,
      amount,
      balanceAfter,
      gameId,
      note,
      createdAt,
      syncStatus
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      transactionId,
      agentId,
      effDeviceId,
      type,
      amount,
      newBalance,
      gameId || null,
      note,
      now,
      'PENDING',
    ]
  );

  database.run(
    `
    INSERT INTO sync_queue
    (
      syncId,
      recordType,
      recordId,
      payload,
      status,
      retryCount,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      'TRANSACTION',
      transactionId,
      JSON.stringify({
        transactionId,
        agentId,
        deviceId:
          effDeviceId,
        type,
        amount,
        balanceAfter:
          newBalance,
        gameId,
        note,
        createdAt: now,
      }),
      'PENDING',
      0,
      now,
    ]
  );

  saveDbToDisk();

  return {
    success: true,
    newBalance,
    transaction: {
      transactionId,
      agentId,
      deviceId:
        effDeviceId,
      type,
      amount,
      balanceAfter:
        newBalance,
      gameId,
      note,
      createdAt: now,
      syncStatus:
        'PENDING',
    },
  };
}

/**
 * ============================================================
 * GET TRANSACTIONS
 * ============================================================
 */
export async function getTransactions(
  agentId?: string
): Promise<Transaction[]> {
  const database = await getDb();

  const query = agentId
    ? `SELECT * FROM transactions WHERE agentId = '${agentId}' ORDER BY createdAt DESC`
    : 'SELECT * FROM transactions ORDER BY createdAt DESC';

  const res =
    database.exec(query);

  if (res.length === 0) {
    return [];
  }

  const columns =
    res[0].columns;

  return res[0].values.map(
    (row) => {
      const obj: any = {};

      columns.forEach(
        (col, idx) => {
          obj[col] =
            row[idx];
        }
      );

      return {
        transactionId:
          obj.transactionId,
        agentId:
          obj.agentId,
        deviceId:
          obj.deviceId,
        type:
          obj.type,
        amount:
          Number(obj.amount),
        balanceAfter:
          Number(
            obj.balanceAfter
          ),
        gameId:
          obj.gameId,
        packageName:
          obj.packageName ||
          undefined,
        note:
          obj.note,
        createdAt:
          obj.createdAt,
        syncStatus:
          obj.syncStatus,
      };
    }
  );
}

/**
 * ============================================================
 * SAVE GAME RECORD
 * ============================================================
 */
export async function saveGameRecord(
  game: Game
): Promise<void> {
  const database = await getDb();

  database.run(
    `
    INSERT OR REPLACE INTO games
    (
      gameId,
      agentId,
      deviceId,
      calledNumbers,
      startTime,
      endTime,
      status,
      winnerCardId,
      winningPattern,
      gameCost,
      createdAt,
      syncStatus
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      game.gameId,
      game.agentId,
      game.deviceId,
      JSON.stringify(
        game.calledNumbers
      ),
      game.startTime,
      game.endTime || null,
      game.status,
      game.winnerCardId ||
        null,
      game.winningPattern ||
        null,
      game.gameCost,
      game.createdAt,
      game.syncStatus,
    ]
  );

  database.run(
    `
    INSERT OR REPLACE INTO sync_queue
    (
      syncId,
      recordType,
      recordId,
      payload,
      status,
      retryCount,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      'GAME',
      game.gameId,
      JSON.stringify(game),
      'PENDING',
      0,
      new Date().toISOString(),
    ]
  );

  saveDbToDisk();
}

/**
 * ============================================================
 * GET ALL GAMES
 * ============================================================
 */
export async function getAllGames(
  agentId?: string
): Promise<Game[]> {
  const database = await getDb();

  const query = agentId
    ? `SELECT * FROM games WHERE agentId = '${agentId}' ORDER BY createdAt DESC`
    : 'SELECT * FROM games ORDER BY createdAt DESC';

  const res =
    database.exec(query);

  if (res.length === 0) {
    return [];
  }

  const columns =
    res[0].columns;

  return res[0].values.map(
    (row) => {
      const obj: any = {};

      columns.forEach(
        (col, idx) => {
          obj[col] =
            row[idx];
        }
      );

      return {
        gameId:
          obj.gameId,
        agentId:
          obj.agentId,
        deviceId:
          obj.deviceId,
        calledNumbers:
          JSON.parse(
            obj.calledNumbers ||
              '[]'
          ),
        calledDetails: [],
        startTime:
          obj.startTime,
        endTime:
          obj.endTime,
        status:
          obj.status,
        winnerCardId:
          obj.winnerCardId,
        winningPattern:
          obj.winningPattern,
        gameCost:
          Number(
            obj.gameCost || 0
          ),
        createdAt:
          obj.createdAt,
        syncStatus:
          obj.syncStatus,
      };
    }
  );
}

/**
 * ============================================================
 * RECORD WINNER
 * ============================================================
 */
export async function recordWinner(
  winner: WinnerRecord
): Promise<void> {
  const database = await getDb();

  database.run(
    `
    INSERT INTO winners
    (
      winnerId,
      gameId,
      cardId,
      agentId,
      pattern,
      matchedNumbers,
      verifiedAt,
      prizeAmount,
      prizeNotes,
      syncStatus
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      winner.winnerId,
      winner.gameId,
      winner.cardId,
      winner.agentId,
      winner.pattern,
      JSON.stringify(
        winner.matchedNumbers
      ),
      winner.verifiedAt,
      winner.prizeAmount ||
        null,
      winner.prizeNotes ||
        null,
      winner.syncStatus,
    ]
  );

  database.run(
    `
    INSERT INTO sync_queue
    (
      syncId,
      recordType,
      recordId,
      payload,
      status,
      retryCount,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      'WINNER',
      winner.winnerId,
      JSON.stringify(winner),
      'PENDING',
      0,
      new Date().toISOString(),
    ]
  );

  saveDbToDisk();
}

/**
 * ============================================================
 * GET ALL WINNERS
 * ============================================================
 */
export async function getAllWinners(): Promise<WinnerRecord[]> {
  const database = await getDb();

  const res = database.exec(
    'SELECT * FROM winners ORDER BY verifiedAt DESC'
  );

  if (res.length === 0) {
    return [];
  }

  const columns =
    res[0].columns;

  return res[0].values.map(
    (row) => {
      const obj: any = {};

      columns.forEach(
        (col, idx) => {
          obj[col] =
            row[idx];
        }
      );

      return {
        winnerId:
          obj.winnerId,
        gameId:
          obj.gameId,
        cardId:
          obj.cardId,
        agentId:
          obj.agentId,
        pattern:
          obj.pattern,
        matchedNumbers:
          JSON.parse(
            obj.matchedNumbers ||
              '[]'
          ),
        verifiedAt:
          obj.verifiedAt,
        prizeAmount:
          obj.prizeAmount
            ? Number(
                obj.prizeAmount
              )
            : undefined,
        prizeNotes:
          obj.prizeNotes,
        syncStatus:
          obj.syncStatus,
      };
    }
  );
}

/**
 * ============================================================
 * GET SYSTEM SETTINGS
 * ============================================================
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const database = await getDb();

  const res = database.exec(
    "SELECT value FROM system_settings WHERE key = 'app_config'"
  );

  if (
    res.length === 0 ||
    res[0].values.length === 0
  ) {
    return {
      gameCost: 50,
      companyName:
        'EilaBingo Community Network',
      locationName:
        'Offline District Ops',
      currencySymbol: 'CR',
      autoSyncIntervalSec: 300,
      voiceAnnounceEnabled: true,
      allowedPatterns: [
        'ANY_LINE',
        'HORIZONTAL_LINE',
        'VERTICAL_LINE',
        'DIAGONAL_LINE',
        'FOUR_CORNERS',
        'POSTAGE_STAMP',
        'PLUS_CROSS',
        'FULL_CARD_BLACKOUT',
      ],
      centralServerUrl:
        'https://central-bingo-atlas.internal/api/sync',
      centerFreeText: 'FREE',
    };
  }

  return JSON.parse(
    res[0].values[0][0] as string
  );
}

/**
 * ============================================================
 * SAVE SYSTEM SETTINGS
 * ============================================================
 */
export async function saveSystemSettings(
  settings: SystemSettings
): Promise<void> {
  const database = await getDb();

  database.run(
    `
    INSERT OR REPLACE INTO system_settings
    (key, value, updatedAt)
    VALUES ('app_config', ?, ?)
    `,
    [
      JSON.stringify(settings),
      new Date().toISOString(),
    ]
  );

  saveDbToDisk();
}

/**
 * ============================================================
 * GET SYNC QUEUE
 * ============================================================
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = await getDb();

  const res = database.exec(
    `
    SELECT *
    FROM sync_queue
    WHERE status = 'PENDING'
    ORDER BY createdAt ASC
    `
  );

  if (res.length === 0) {
    return [];
  }

  const columns =
    res[0].columns;

  return res[0].values.map(
    (row) => {
      const obj: any = {};

      columns.forEach(
        (col, idx) => {
          obj[col] =
            row[idx];
        }
      );

      return {
        syncId:
          obj.syncId,
        recordType:
          obj.recordType,
        recordId:
          obj.recordId,
        payload:
          JSON.parse(
            obj.payload || '{}'
          ),
        status:
          obj.status,
        retryCount:
          Number(
            obj.retryCount
          ),
        lastAttempt:
          obj.lastAttempt,
        createdAt:
          obj.createdAt,
        error:
          obj.error,
      };
    }
  );
}

/**
 * ============================================================
 * MARK SYNCED ITEMS
 * ============================================================
 */
export async function markSyncedItems(
  syncedRecordIds: string[]
): Promise<void> {
  if (
    syncedRecordIds.length === 0
  ) {
    return;
  }

  const database = await getDb();

  const now =
    new Date().toISOString();

  for (
    const id of syncedRecordIds
  ) {
    database.run(
      `
      UPDATE sync_queue
      SET
        status = 'SYNCED',
        lastAttempt = ?
      WHERE recordId = ?
      `,
      [now, id]
    );

    database.run(
      `
      UPDATE transactions
      SET syncStatus = 'SYNCED'
      WHERE transactionId = ?
      `,
      [id]
    );

    database.run(
      `
      UPDATE games
      SET syncStatus = 'SYNCED'
      WHERE gameId = ?
      `,
      [id]
    );

    database.run(
      `
      UPDATE winners
      SET syncStatus = 'SYNCED'
      WHERE winnerId = ?
      `,
      [id]
    );
  }

  saveDbToDisk();
}

/**
 * ============================================================
 * IMPORT SQLITE DATABASE
 * ============================================================
 *
 * Even if an imported DB contains different cards,
 * the system immediately restores the permanent 75 cards.
 */
export async function importSqliteBuffer(
  buffer: Buffer
): Promise<boolean> {
  try {
    if (!SQL) {
      SQL = await initSqlJs();
    }

    const newDb =
      new SQL.Database(buffer);

    /**
     * Verify valid SQLite structure.
     */
    newDb.exec(
      'SELECT count(*) FROM sqlite_master;'
    );

    /**
     * Make imported DB the active DB.
     */
    db = newDb;

    /**
     * Make sure all required tables exist.
     */
    initSchema(db);

    /**
     * IMPORTANT:
     * Imported database can NEVER replace
     * our permanent fixed 75-card set.
     */
    ensureFixedBingoCards(db);

    /**
     * Save the corrected DB.
     */
    const data =
      db.export();

    fs.writeFileSync(
      DB_FILE,
      Buffer.from(data)
    );

    console.log(
      'SQLite database imported successfully.'
    );

    console.log(
      'Fixed bingo cards enforced: CARD-0001 to CARD-0075'
    );

    return true;
  } catch (err) {
    console.error(
      'Failed to import SQLite buffer:',
      err
    );

    return false;
  }
}
