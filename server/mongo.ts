import { MongoClient, Db } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { Agent, BingoCard, Game, SystemSettings, Transaction, WinnerRecord, AgentStatus, AgentPackageAssignment } from '../src/types/bingo';
import { generateBatchFixedCards } from '../src/utils/bingoEngine';

const MONGO_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'bingo_system';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let connectionError: string | null = null;
let connectionTimestamp: string | null = null;

export async function connectMongo(): Promise<Db | null> {
  if (db && isConnected) return db;

 try {
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI environment variable is missing');
  }

  const maskedUri = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
  console.log(`Checking MongoDB Atlas connection at ${maskedUri}...`);
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      tls: true,
      directConnection: false,
      retryWrites: true,
    });

    await client.connect();

    // Verify that Atlas is reachable and credentials are valid.
    await client.db('admin').command({ ping: 1 });

    db = client.db(DB_NAME);
    isConnected = true;
    connectionError = null;
    connectionTimestamp = new Date().toISOString();
    console.log('✅ Connected to MongoDB Atlas successfully!');

    // Initialize collections & seeds
    await seedMongoDb(db);
    return db;
} catch (err: any) {
  isConnected = false;
  db = null;

  connectionError = err?.message || 'MongoDB connection failed';

  console.error('❌ MongoDB Atlas connection failed');
  console.error('MongoDB error:', connectionError);

  return null;
}
}

export function getMongoDb(): Db | null {
  return isConnected ? db : null;
}

export function getMongoStatus() {
  return {
    isConnected,
    error: connectionError,
    uri: MONGO_URI
      ? MONGO_URI.replace(/:([^:@]+)@/, ':****@')
      : '(not configured)',
    dbName: DB_NAME,
    timestamp: connectionTimestamp,
    mode: isConnected ? 'ONLINE_ATLAS' : 'OFFLINE_LOCAL_SQLITE',
  };
}
export function isMongoConnected(): boolean {
  return isConnected && db !== null;
}
async function seedMongoDb(database: Db) {
  try {
    const adminsCol = database.collection('admins');
    const agentsCol = database.collection('agents');
    const cardsCol = database.collection('cards');
    const settingsCol = database.collection('settings');
    const transactionsCol = database.collection('transactions');

    // Helpful indexes and uniqueness constraints.
    await Promise.all([
      adminsCol.createIndex({ username: 1 }, { unique: true }),
      agentsCol.createIndex({ agentId: 1 }, { unique: true }),
      cardsCol.createIndex({ cardId: 1 }, { unique: true }),
      settingsCol.createIndex({ key: 1 }, { unique: true }),
      transactionsCol.createIndex({ transactionId: 1 }, { unique: true }),
    ]);

    // 1. Seed Super Admin
    const adminCount = await adminsCol.countDocuments({ username: 'admin' });
    if (adminCount === 0) {
      await adminsCol.insertOne({
        id: 'ADMIN-001',
        username: 'admin',
        password: 'admin123',
        name: 'Super Admin Master',
        role: 'SUPER_ADMIN',
        permissions: ['ALL_CRUD', 'AGENT_MANAGE', 'BAN_AGENT', 'PACKAGE_ASSIGN', 'CARD_GENERATE', 'SYSTEM_SETTINGS'],
        createdAt: new Date().toISOString(),
      });
      console.log('🌱 Seeded default Super Admin into MongoDB');
    }

    // 2. Seed Default Agents
    const agentCount = await agentsCol.countDocuments();
    if (agentCount === 0) {
      const now = new Date().toISOString();
      const defaultAgents: Agent[] = [
        {
          agentId: 'AGENT-101',
          name: 'Township Hall Operator',
          location: 'Pine Creek Community Center',
          phone: '+1 (555) 234-8901',
          pin: '1234',
          balance: 1500,
          packageAssigned: {
            packageName: 'Silver Club Package',
            credits: 1500,
            gamesAllowed: 30,
            costPerGame: 50,
            assignedAt: now,
            price: 110,
          },
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
          balance: 1250,
          packageAssigned: {
            packageName: 'Bronze Host Package',
            credits: 1250,
            gamesAllowed: 25,
            costPerGame: 50,
            assignedAt: now,
            price: 60,
          },
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
          balance: 500,
          packageAssigned: {
            packageName: 'Starter Package',
            credits: 500,
            gamesAllowed: 10,
            costPerGame: 50,
            assignedAt: now,
            price: 25,
          },
          deviceId: 'DEV-PC-003',
          status: 'ACTIVE',
          createdAt: now,
        },
      ];

      for (const a of defaultAgents) {
        await agentsCol.insertOne(a);
        await transactionsCol.insertOne({
          transactionId: uuidv4(),
          agentId: a.agentId,
          deviceId: a.deviceId,
          type: 'PACKAGE_CREDIT',
          amount: a.balance,
          balanceAfter: a.balance,
          packageName: a.packageAssigned?.packageName,
          note: 'Initial Seed Package Allocation',
          createdAt: now,
          syncStatus: 'SYNCED',
        });
      }
      console.log('🌱 Seeded default Agents & Packages into MongoDB');
    }

    // 3. Ensure the complete fixed CARD-0001 ... CARD-0075 set exists.
    // These cards are deterministic and permanent.
    const fixedCards = generateBatchFixedCards(75, 1, 'CARD-');

    await cardsCol.bulkWrite(
      fixedCards.map((card) => ({
        replaceOne: {
          filter: { cardId: card.cardId },
          replacement: card,
          upsert: true,
        },
      })),
      { ordered: false }
    );

    const fixedCardCount = await cardsCol.countDocuments({
      cardId: /^CARD-\\d{4}$/,
    });

    console.log(`✅ MongoDB fixed card set verified: ${fixedCardCount}/75 cards`);

    // 4. Seed Settings
    const settingsCount = await settingsCol.countDocuments({ key: 'app_config' });
    if (settingsCount === 0) {
      const defaultSettings: SystemSettings = {
        gameCost: 50,
        companyName: 'EilaBingo Community Network',
        locationName: 'District Operations Center',
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
        centralServerUrl: process.env.CENTRAL_SERVER_URL || '',
        centerFreeText: 'FREE',
      };
      await settingsCol.insertOne({
        key: 'app_config',
        value: defaultSettings,
        updatedAt: new Date().toISOString(),
      });
      console.log('🌱 Seeded System Settings into MongoDB');
    }
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  }
}

// ----------------------------------------------------
// MONGO DB CRUD METHODS
// ----------------------------------------------------

// AGENTS CRUD
export async function mongoGetAllAgents(): Promise<Agent[]> {
  const database = getMongoDb();
  if (!database) return [];
  const col = database.collection<Agent>('agents');
  return await col.find({}, { projection: { _id: 0 } }).sort({ agentId: 1 }).toArray();
}

export async function mongoGetAgentById(agentId: string): Promise<Agent | null> {
  const database = getMongoDb();
  if (!database) return null;
  const col = database.collection<Agent>('agents');
  return await col.findOne({ agentId }, { projection: { _id: 0 } });
}

export async function mongoCreateAgent(agent: Agent): Promise<Agent> {
  const database = getMongoDb();
  if (database) {
    const col = database.collection<Agent>('agents');
    await col.insertOne({ ...agent });
  }
  return agent;
}

export async function mongoUpdateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
  const database = getMongoDb();
  if (!database) return null;
  const col = database.collection<Agent>('agents');
  await col.updateOne({ agentId }, { $set: updates });
  return await mongoGetAgentById(agentId);
}

export async function mongoDeleteAgent(agentId: string): Promise<boolean> {
  const database = getMongoDb();
  if (!database) return false;
  const col = database.collection<Agent>('agents');
  const res = await col.deleteOne({ agentId });
  return res.deletedCount > 0;
}

export async function mongoSetAgentStatus(agentId: string, status: AgentStatus, banReason?: string): Promise<Agent | null> {
  const database = getMongoDb();
  if (!database) return null;
  const col = database.collection<Agent>('agents');
  await col.updateOne({ agentId }, { $set: { status, banReason: banReason || (status === 'BANNED' ? 'Administrative Ban' : '') } });
  return await mongoGetAgentById(agentId);
}

export async function mongoAssignPackage(
  agentId: string,
  assignment: AgentPackageAssignment,
  note?: string
): Promise<{ agent: Agent; transaction: Transaction } | null> {
  const database = getMongoDb();
  if (!database) return null;

  const currentAgent = await mongoGetAgentById(agentId);
  if (!currentAgent) return null;

  const newBalance = (currentAgent.balance || 0) + assignment.credits;
  const now = new Date().toISOString();
  const txId = uuidv4();

  const transaction: Transaction = {
    transactionId: txId,
    agentId,
    deviceId: currentAgent.deviceId,
    type: 'PACKAGE_CREDIT',
    amount: assignment.credits,
    balanceAfter: newBalance,
    packageName: assignment.packageName,
    note: note || `Assigned Package: ${assignment.packageName} (+${assignment.credits} CR for ${assignment.gamesAllowed} games)`,
    createdAt: now,
    syncStatus: 'SYNCED',
  };

  const agentsCol = database.collection<Agent>('agents');
  const txCol = database.collection<Transaction>('transactions');

  await agentsCol.updateOne(
    { agentId },
    {
      $set: {
        balance: newBalance,
        packageAssigned: assignment,
        lastSync: now,
      },
    }
  );

  await txCol.insertOne(transaction);

  const updatedAgent = await mongoGetAgentById(agentId);
  return { agent: updatedAgent!, transaction };
}

// CREDIT / GAME BALANCE
export async function mongoAdjustAgentCredit(
  agentId: string,
  amount: number,
  note = 'Balance adjustment',
  transactionType: Transaction['type'] = 'GAME_PLAY' as Transaction['type']
): Promise<{ agent: Agent; transaction: Transaction } | null> {
  const database = getMongoDb();
  if (!database) return null;

  const agentsCol = database.collection<Agent>('agents');
  const txCol = database.collection<Transaction>('transactions');

  const currentAgent = await mongoGetAgentById(agentId);
  if (!currentAgent) return null;

  const oldBalance = Number(currentAgent.balance || 0);
  const newBalance = oldBalance + Number(amount);

  if (!Number.isFinite(amount)) {
    throw new Error('Invalid credit amount.');
  }

  if (newBalance < 0) {
    throw new Error('Insufficient agent balance.');
  }

  const now = new Date().toISOString();
  const transaction: Transaction = {
    transactionId: uuidv4(),
    agentId,
    deviceId: currentAgent.deviceId,
    type: transactionType,
    amount,
    balanceAfter: newBalance,
    note,
    createdAt: now,
    syncStatus: 'SYNCED',
  };

  const updateResult = await agentsCol.updateOne(
    { agentId },
    {
      $set: {
        balance: newBalance,
        lastSync: now,
      },
    }
  );

  if (updateResult.matchedCount === 0) {
    return null;
  }

  await txCol.insertOne(transaction);

  const updatedAgent = await mongoGetAgentById(agentId);
  if (!updatedAgent) return null;

  return {
    agent: updatedAgent,
    transaction,
  };
}

// CARDS CRUD
export async function mongoGetAllCards(search?: string, limit?: number): Promise<BingoCard[]> {
  const database = getMongoDb();
  if (!database) return [];
  const col = database.collection<BingoCard>('cards');
  let query: any = {};
  if (search) {
    query = { cardId: { $regex: search, $options: 'i' } };
  }
  let cursor = col.find(query, { projection: { _id: 0 } }).sort({ cardId: 1 });
  if (limit) {
    cursor = cursor.limit(limit);
  }
  return await cursor.toArray();
}

export async function mongoGetCardById(cardId: string): Promise<BingoCard | null> {
  const database = getMongoDb();
  if (!database) return null;
  const col = database.collection<BingoCard>('cards');
  return await col.findOne({ cardId: cardId.toUpperCase() }, { projection: { _id: 0 } });
}

export async function mongoInsertCards(cards: BingoCard[]): Promise<number> {
  const database = getMongoDb();
  if (!database) return 0;
  const col = database.collection<BingoCard>('cards');
  try {
    const res = await col.insertMany(cards, { ordered: false });
    return res.insertedCount;
  } catch (err: any) {
    return err.result?.nInserted || 0;
  }
}

export async function mongoDeleteCard(cardId: string): Promise<boolean> {
  const database = getMongoDb();
  if (!database) return false;
  const col = database.collection<BingoCard>('cards');
  const res = await col.deleteOne({ cardId: cardId.toUpperCase() });
  return res.deletedCount > 0;
}

// GAMES & WINNERS
export async function mongoSaveGame(game: Game): Promise<void> {
  const database = getMongoDb();
  if (!database) return;
  const col = database.collection<Game>('games');
  await col.replaceOne({ gameId: game.gameId }, game, { upsert: true });
}

export async function mongoGetAllGames(agentId?: string): Promise<Game[]> {
  const database = getMongoDb();
  if (!database) return [];
  const col = database.collection<Game>('games');
  const query = agentId ? { agentId } : {};
  return await col.find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function mongoRecordWinner(winner: WinnerRecord): Promise<void> {
  const database = getMongoDb();
  if (!database) return;
  const col = database.collection<WinnerRecord>('winners');
  await col.insertOne(winner);
}

export async function mongoGetAllWinners(agentId?: string): Promise<WinnerRecord[]> {
  const database = getMongoDb();
  if (!database) return [];
  const col = database.collection<WinnerRecord>('winners');
  const query = agentId ? { agentId } : {};
  return await col.find(query, { projection: { _id: 0 } }).sort({ verifiedAt: -1 }).toArray();
}

// TRANSACTIONS
export async function mongoGetTransactions(agentId?: string): Promise<Transaction[]> {
  const database = getMongoDb();
  if (!database) return [];
  const col = database.collection<Transaction>('transactions');
  const query = agentId ? { agentId } : {};
  return await col.find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
}

export async function mongoSaveTransaction(tx: Transaction): Promise<void> {
  const database = getMongoDb();
  if (!database) return;
  const col = database.collection<Transaction>('transactions');
  await col.insertOne(tx);
}

// SETTINGS
export async function mongoGetSettings(): Promise<SystemSettings | null> {
  const database = getMongoDb();
  if (!database) return null;
  const col = database.collection('settings');
  const doc = await col.findOne({ key: 'app_config' });
  return doc?.value || null;
}

export async function mongoSaveSettings(settings: SystemSettings): Promise<void> {
  const database = getMongoDb();
  if (!database) return;
  const col = database.collection('settings');
  await col.replaceOne(
    { key: 'app_config' },
    { key: 'app_config', value: settings, updatedAt: new Date().toISOString() },
    { upsert: true }
  );
}
