import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';
import {
  getAllCards,
  getCardById,
  insertBatchCards,
  deleteCard,
  adjustAgentCredit,
  getTransactions,
  saveGameRecord,
  getAllGames,
  recordWinner,
  getAllWinners,
  getSystemSettings,
  saveSystemSettings,
  getSyncQueue,
  getDb,
  DB_FILE,
  saveDbToDisk,
  importSqliteBuffer,
} from './server/db';
import {
  connectMongo,
  getMongoStatus,
  isMongoConnected,
  mongoGetAllAgents,
  mongoGetAgentById,
  mongoCreateAgent,
  mongoUpdateAgent,
  mongoDeleteAgent,
  mongoSetAgentStatus,
  mongoAssignPackage,
  mongoDeleteCard,
} from './server/mongo';
import { syncManager } from './server/syncEngine';
import { verifyBingoCard, getBingoLetter } from './src/utils/bingoEngine';
import { Game, WinnerRecord, Agent, AgentStatus } from './src/types/bingo';

const app = express();

const allowedOrigin =
  process.env.FRONTEND_URL || 'https://ellabingo.vercel.app';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Vary', 'Origin');
  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize SQLite & MongoDB Atlas databases
(async () => {
  try {
    await getDb();
    console.log('✅ Local SQLite database initialized');
  } catch (e) {
    console.error('Error initializing SQLite:', e);
  }

  try {
    await connectMongo();
  } catch (e) {
    console.error('Error connecting to MongoDB Atlas:', e);
  }
})();

// API ROUTES FIRST

// Database / Atlas Status Endpoint
app.get('/api/db/status', async (req, res) => {
  try {
    const mongoStatus = getMongoStatus();
    const agents = isMongoConnected() ? await mongoGetAllAgents() : [];
    const cards = await getAllCards();
    const games = await getAllGames();
    res.json({
      success: true,
      mongo: mongoStatus,
      localSqlite: {
        active: true,
        agentsCount: agents.length,
        cardsCount: cards.length,
        gamesCount: games.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Unified Auth Login Endpoint (Super Admin & Agent)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, agentId, pin } = req.body;

    const inputIdentifier = String(username || agentId || '').trim();
    const inputSecret = String(password || pin || '').trim();

    if (!inputIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'Username is required.',
      });
    }

    if (!inputSecret) {
      return res.status(400).json({
        success: false,
        error: 'Password is required.',
      });
    }

    const cleanLowerId = inputIdentifier.toLowerCase();

    // =========================================================
    // 1. SUPER ADMIN LOGIN
    // =========================================================
    if (
      cleanLowerId === 'admin' ||
      cleanLowerId === 'superadmin' ||
      cleanLowerId === 'root' ||
      cleanLowerId === 'alazar1of1@gmail.com' ||
      cleanLowerId.includes('admin')
    ) {
      if (
        inputSecret === 'admin123' ||
        inputSecret === 'admin' ||
        inputSecret === 'password' ||
        inputSecret === '1234' ||
        inputSecret === '123456'
      ) {
        return res.json({
          success: true,
          user: {
            id: 'ADMIN-001',
            role: 'SUPER_ADMIN',
            name: 'Super Admin',
            username: inputIdentifier,
          },
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid password for Super Admin. Use password: admin123',
      });
    }

    // =========================================================
    // 2. AGENT LOGIN - MONGODB ATLAS IS THE SOURCE OF TRUTH
    // =========================================================
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error:
          'MongoDB Atlas is not connected. Agent login is temporarily unavailable.',
      });
    }

    const allAgents = await mongoGetAllAgents();

    let agent = allAgents.find(
      (a) =>
        String(a.agentId || '').toLowerCase() === cleanLowerId ||
        String(a.agentId || '').toLowerCase().replace('agent-', '') ===
          cleanLowerId ||
        String(a.name || '').toLowerCase() === cleanLowerId ||
        String(a.name || '').toLowerCase().includes(cleanLowerId)
    );

    // Generic agent/operator login falls back to the first active agent.
    if (
      !agent &&
      (
        cleanLowerId === 'agent' ||
        cleanLowerId === 'operator' ||
        cleanLowerId === 'caller'
      )
    ) {
      agent =
        allAgents.find((a) => a.status === 'ACTIVE') ||
        allAgents[0];
    }

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    // Only the agent's real PIN is accepted.
    const isValidPin = String(agent.pin || '') === inputSecret;

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.',
      });
    }

    // Check account status.
    if (agent.status === 'BANNED' || agent.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: `Agent account is ${agent.status}. Reason: ${
          agent.banReason || 'Administrative restriction'
        }.`,
      });
    }

    return res.json({
      success: true,
      user: {
        id: agent.agentId,
        role: 'AGENT',
        name: agent.name,
        agent,
      },
    });
  } catch (err: any) {
    console.error('POST /api/auth/login error:', err);

    return res.status(500).json({
      success: false,
      error: err.message || 'Login failed.',
    });
  }
});

// Cards API
app.get('/api/cards', async (req, res) => {
  try {
    const { search, limit } = req.query;
    let cards = await getAllCards();
    if (search) {
      const q = String(search).toUpperCase();
      cards = cards.filter((c) => c.cardId.toUpperCase().includes(q));
    }
    if (limit) {
      cards = cards.slice(0, Number(limit));
    }
    res.json({ success: true, count: cards.length, cards });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/cards/:cardId', async (req, res) => {
  try {
    const card = await getCardById(req.params.cardId);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }
    res.json({ success: true, card });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fixed Card Generator (Super Admin)
/*app.post('/api/cards/generate', async (req, res) => {
  try {
    const { count = 50, startNumber = 1, prefix = 'CARD-' } = req.body;
    const cards = generateBatchFixedCards(Number(count), Number(startNumber), String(prefix));
    const result = await insertBatchCards(cards);
    res.json({
      success: true,
      generated: cards.length,
      inserted: result.inserted,
      duplicates: result.duplicates,
      firstCardId: cards[0]?.cardId,
      lastCardId: cards[cards.length - 1]?.cardId,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});*/

// Delete Card (Super Admin)
app.delete('/api/cards/:cardId', async (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Bingo cards are fixed and cannot be deleted.',
  });
});

// Agents API (Super Admin Full CRUD)
// ============================================================
// AGENTS API - MONGODB IS THE SOURCE OF TRUTH
// ============================================================

// Get all agents
app.get('/api/agents', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected. Agents are temporarily unavailable.',
      });
    }

    const agents = await mongoGetAllAgents();

    res.json({
      success: true,
      agents,
    });
  } catch (err: any) {
    console.error('GET /api/agents error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Get one agent
app.get('/api/agents/:agentId', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected.',
      });
    }

    const agentId = req.params.agentId.toUpperCase();

    const agent = await mongoGetAgentById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    res.json({
      success: true,
      agent,
    });
  } catch (err: any) {
    console.error('GET /api/agents/:agentId error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Create Agent
app.post('/api/agents', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected. Cannot create agent.',
      });
    }

    const {
      agentId,
      name,
      location,
      phone,
      pin,
      balance,
      packageAssigned,
      deviceId,
    } = req.body;

    const autoId = agentId
      ? String(agentId).trim().toUpperCase()
      : `AGENT-${Math.floor(100 + Math.random() * 900)}`;

    // Check MongoDB, not SQLite
    const existing = await mongoGetAgentById(autoId);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Agent ID ${autoId} already exists.`,
      });
    }

    const initialBalance = Number(
      balance || packageAssigned?.credits || 0
    );

    const now = new Date().toISOString();

    const newAgent: Agent = {
      agentId: autoId,
      name: name || `Agent ${autoId}`,
      location: location || 'Community Hall',
      phone: phone || '',
      pin: pin || '1234',
      balance: initialBalance,

      packageAssigned:
        packageAssigned ||
        (initialBalance > 0
          ? {
              packageName: 'Standard Package',
              credits: initialBalance,
              gamesAllowed: Math.floor(initialBalance / 50),
              costPerGame: 50,
              assignedAt: now,
            }
          : undefined),

      deviceId:
        deviceId || `DEV-${uuidv4().substring(0, 8)}`,

      status: 'ACTIVE',
      createdAt: now,
    };

    // MongoDB is now the MAIN database
    const created = await mongoCreateAgent(newAgent);

    res.json({
      success: true,
      agent: created,
    });
  } catch (err: any) {
    console.error('POST /api/agents error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Update Agent
app.put('/api/agents/:agentId', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected. Cannot update agent.',
      });
    }

    const agentId = req.params.agentId.toUpperCase();

    const {
      name,
      location,
      phone,
      pin,
      deviceId,
      status,
    } = req.body;

    const existing = await mongoGetAgentById(agentId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    const updates: Partial<Agent> = {
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      ...(phone !== undefined && { phone }),
      ...(pin !== undefined && { pin }),
      ...(deviceId !== undefined && { deviceId }),
      ...(status !== undefined && { status }),
    };

    const updated = await mongoUpdateAgent(
      agentId,
      updates
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    res.json({
      success: true,
      agent: updated,
    });
  } catch (err: any) {
    console.error('PUT /api/agents/:agentId error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Delete Agent
app.delete('/api/agents/:agentId', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected. Cannot delete agent.',
      });
    }

    const agentId = req.params.agentId.toUpperCase();

    const existing = await mongoGetAgentById(agentId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    const deleted = await mongoDeleteAgent(agentId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: `Failed to delete Agent ${agentId}`,
      });
    }

    res.json({
      success: true,
      message: `Agent ${agentId} deleted successfully`,
    });
  } catch (err: any) {
    console.error('DELETE /api/agents/:agentId error:', err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Ban / Suspend / Activate Agent
app.post('/api/agents/:agentId/status', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected. Cannot change agent status.',
      });
    }

    const agentId = req.params.agentId.toUpperCase();

    const {
      status,
      banReason,
    } = req.body as {
      status: AgentStatus;
      banReason?: string;
    };

    if (
      !status ||
      !['ACTIVE', 'BANNED', 'SUSPENDED'].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Valid status (ACTIVE, BANNED, SUSPENDED) is required',
      });
    }

    const existing = await mongoGetAgentById(agentId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    const updated = await mongoSetAgentStatus(
      agentId,
      status,
      banReason
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    res.json({
      success: true,
      agent: updated,
      message: `Agent ${agentId} status updated to ${status}${
        banReason ? ` (${banReason})` : ''
      }`,
    });
  } catch (err: any) {
    console.error(
      'POST /api/agents/:agentId/status error:',
      err
    );

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Assign Package to Agent
app.post('/api/agents/:agentId/package', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB Atlas is not connected. Cannot assign package.',
      });
    }

    const agentId = req.params.agentId.toUpperCase();

    const {
      packageName,
      credits,
      gamesAllowed,
      price,
      note,
    } = req.body;

    const numCredits = Number(credits);

    if (!numCredits || numCredits <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid package credits amount required',
      });
    }

    const assignment: AgentPackageAssignment = {
      packageName:
        packageName || 'Custom Bingo Package',

      credits: numCredits,

      gamesAllowed:
        Number(gamesAllowed) ||
        Math.floor(numCredits / 50),

      costPerGame: 50,

      assignedAt: new Date().toISOString(),

      price:
        price !== undefined
          ? Number(price)
          : undefined,
    };

    const result = await mongoAssignPackage(
      agentId,
      assignment,
      note
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    res.json({
      success: true,
      agent: result.agent,
      transaction: result.transaction,
      message: `Successfully assigned ${assignment.packageName} to ${agentId}`,
    });
  } catch (err: any) {
    console.error(
      'POST /api/agents/:agentId/package error:',
      err
    );

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// Games API
app.get('/api/games', async (req, res) => {
  try {
    const { agentId } = req.query;
    const games = await getAllGames(agentId ? String(agentId) : undefined);
    res.json({ success: true, games });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start new Game (deducts credit atomically)
app.post('/api/games/start', async (req, res) => {
  try {
    const { agentId, deviceId, gamerCount, capturedNumbers, capturedCards } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'agentId is required to start a game' });
    }

    const settings = await getSystemSettings();
    const gameCost = settings.gameCost || 50;

    const gameId = `GAME-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Normalize captured numbers and cards
    let finalNumbers: number[] = Array.isArray(capturedNumbers) ? capturedNumbers : [];
    let finalCards: string[] = Array.isArray(capturedCards) ? capturedCards : [];

    if (finalNumbers.length > 0 && finalCards.length === 0) {
      finalCards = finalNumbers.map((n) => `CARD-${String(n).padStart(4, '0')}`);
    } else if (finalCards.length > 0 && finalNumbers.length === 0) {
      finalNumbers = finalCards.map((c) => parseInt(c.replace('CARD-', ''), 10)).filter((n) => !isNaN(n));
    }

    // System rule: Must insert game card numbers held before starting game!
    if (finalNumbers.length === 0 && finalCards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Held card numbers are mandatory before starting a game. Please insert the player card numbers held for this round.',
      });
    }

    const effectiveGamerCount = gamerCount ? Number(gamerCount) : finalNumbers.length;

    // Deduct agent credit atomically
    const creditResult = await adjustAgentCredit(
      agentId,
      -gameCost,
      'GAME_FEE',
      `Game fee deduction for ${gameId}`,
      gameId,
      deviceId
    );

    const newGame: Game = {
      gameId,
      agentId,
      deviceId: deviceId || 'DEV-PC-LOCAL',
      calledNumbers: [],
      calledDetails: [],
      startTime: new Date().toISOString(),
      status: 'IN_PROGRESS',
      gamerCount: effectiveGamerCount,
      capturedNumbers: finalNumbers,
      capturedCards: finalCards,
      gameCost,
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };

    await saveGameRecord(newGame);

    res.json({
      success: true,
      game: newGame,
      newAgentBalance: creditResult.newBalance,
      transaction: creditResult.transaction,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Record called number / update live game
app.post('/api/games/:gameId/update', async (req, res) => {
  try {
    const { calledNumbers, status, winnerCardId, winningPattern } = req.body;
    const gameId = req.params.gameId;

    const existingGames = await getAllGames();
    const game = existingGames.find((g) => g.gameId === gameId);
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    if (calledNumbers) {
      game.calledNumbers = calledNumbers;
    }
    if (status) {
      game.status = status;
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        game.endTime = new Date().toISOString();
      }
    }
    if (winnerCardId) game.winnerCardId = winnerCardId;
    if (winningPattern) game.winningPattern = winningPattern;

    await saveGameRecord(game);
    res.json({ success: true, game });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Instant Winner Verification against FIXED cards
app.post('/api/games/:gameId/verify', async (req, res) => {
  try {
    const { cardId, calledNumbers } = req.body;
    const cleanCardId = String(cardId).trim().toUpperCase();

    const card = await getCardById(cleanCardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: `Card ID '${cleanCardId}' not found in database. Ensure this physical card was generated.`,
      });
    }

    const settings = await getSystemSettings();
    const verification = verifyBingoCard(card, calledNumbers || [], settings.allowedPatterns);

    res.json({
      success: true,
      verification,
      card,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record winner confirmation
app.post('/api/games/:gameId/winner', async (req, res) => {
  try {
    const { cardId, agentId, pattern, matchedNumbers, prizeAmount, prizeNotes } = req.body;
    const gameId = req.params.gameId;

    const winnerRecord: WinnerRecord = {
      winnerId: uuidv4(),
      gameId,
      cardId,
      agentId,
      pattern,
      matchedNumbers: matchedNumbers || [],
      verifiedAt: new Date().toISOString(),
      prizeAmount: prizeAmount ? Number(prizeAmount) : undefined,
      prizeNotes,
      syncStatus: 'PENDING',
    };

    await recordWinner(winnerRecord);

    // Update game status
    const existingGames = await getAllGames();
    const game = existingGames.find((g) => g.gameId === gameId);
    if (game) {
      game.status = 'COMPLETED';
      game.endTime = new Date().toISOString();
      game.winnerCardId = cardId;
      game.winningPattern = pattern;
      await saveGameRecord(game);
    }

    res.json({ success: true, winner: winnerRecord });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Transactions Ledger API
app.get('/api/transactions', async (req, res) => {
  try {
    const { agentId } = req.query;
    const transactions = await getTransactions(agentId ? String(agentId) : undefined);
    res.json({ success: true, count: transactions.length, transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Winners API
app.get('/api/winners', async (req, res) => {
  try {
    const winners = await getAllWinners();
    res.json({ success: true, winners });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reports & System Summary API
app.get('/api/reports/summary', async (req, res) => {
  try {
    const cards = await getAllCards();
    const agents = isMongoConnected() ? await mongoGetAllAgents() : [];
    const games = await getAllGames();
    const transactions = await getTransactions();
    const winners = await getAllWinners();
    const syncQueue = await getSyncQueue();

    const totalCreditsIssued = transactions
      .filter((t) => t.type === 'PACKAGE_CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCreditsSpent = transactions
      .filter((t) => t.type === 'GAME_FEE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalCurrentAgentBalances = agents.reduce((sum, a) => sum + a.balance, 0);

    res.json({
      success: true,
      stats: {
        totalCards: cards.length,
        totalAgents: agents.length,
        totalGames: games.length,
        totalCompletedGames: games.filter((g) => g.status === 'COMPLETED').length,
        totalWinners: winners.length,
        totalCreditsIssued,
        totalCreditsSpent,
        totalCurrentAgentBalances,
        pendingSyncCount: syncQueue.length,
      },
      recentTransactions: transactions.slice(0, 10),
      recentGames: games.slice(0, 10),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// System Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    await saveSystemSettings(req.body);
    res.json({ success: true, settings: req.body });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sync & Network Simulation API
app.get('/api/sync/status', async (req, res) => {
  try {
    const queue = await getSyncQueue();
    const netStatus = syncManager.getNetworkStatus();
    res.json({
      success: true,
      ...netStatus,
      pendingCount: queue.length,
      queue,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sync/now', async (req, res) => {
  try {
    const { agentId } = req.body;
    const result = await syncManager.performIdempotentSync(agentId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sync/network-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    syncManager.setNetworkMode(mode);
    res.json({ success: true, ...syncManager.getNetworkStatus() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Offline SQLite Database Endpoints (Download .sqlite file, Upload/Import, Info)
app.get('/api/sqlite/download', async (req, res) => {
  try {
    await getDb();
    saveDbToDisk();
    if (fs.existsSync(DB_FILE)) {
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="bingo_local.sqlite"');
      const stream = fs.createReadStream(DB_FILE);
      stream.pipe(res);
    } else {
      res.status(404).json({ success: false, error: 'SQLite database file not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sqlite/info', async (req, res) => {
  try {
    await getDb();
    saveDbToDisk();
    const stats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : null;
    res.json({
      success: true,
      engine: 'sql.js (WebAssembly SQLite Embedded)',
      filename: 'bingo_local.sqlite',
      path: DB_FILE,
      sizeBytes: stats ? stats.size : 0,
      sizeFormatted: stats ? `${(stats.size / 1024).toFixed(1)} KB` : '0 KB',
      lastModified: stats ? stats.mtime.toISOString() : null,
      isOfflineReady: true,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sqlite/import', express.raw({ type: ['application/octet-stream', 'application/x-sqlite3', 'application/vnd.sqlite3'], limit: '50mb' }), async (req, res) => {
  try {
    if (!req.body || !(req.body instanceof Buffer) || req.body.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid SQLite database file buffer required' });
    }
    const success = await importSqliteBuffer(req.body);
    if (success) {
      res.json({ success: true, message: 'SQLite database successfully imported and active' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid or corrupt SQLite database file' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite Middleware for Development / Static in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bingo Management Server running at http://localhost:${PORT}`);
  });
}

startServer();
