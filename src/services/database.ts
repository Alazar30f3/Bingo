import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite';
import { Agent, BingoCard, Game, SystemSettings, Transaction, WinnerRecord, SyncQueueItem } from '../types/bingo';


async function runQuery(sql: string, params: any[] = []): Promise<any[]> {
  const database = getDb();
  const res = await database.query(sql, params);
  return res.values || [];
}

async function runExecute(sql: string, params: any[] = []): Promise<void> {
  const database = getDb();
  await database.run(sql, params);
}

export async function seedDefaultData(): Promise<void> {
  const adminRes = await runQuery("SELECT COUNT(*) as count FROM admins WHERE username = 'admin'");
  if (adminRes.length === 0 || adminRes[0].count === 0) {
    const now = new Date().toISOString();
    await runExecute(
      "INSERT INTO admins (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      ['ADMIN-001', 'admin', 'admin123', 'Super Admin Master', 'ADMIN', now]
    );
  }

  const agentRes = await runQuery('SELECT COUNT(*) as count FROM agents');
  if (agentRes.length === 0 || agentRes[0].count === 0) {
    const now = new Date().toISOString();
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
      await runExecute(
        'INSERT INTO agents (agentId, name, location, phone, pin, balance, deviceId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [a.agentId, a.name, a.location, a.phone, a.pin, a.balance, a.deviceId, a.status, a.createdAt]
      );
      const txId = uuidv4();
      await runExecute(
        'INSERT INTO transactions (transactionId, agentId, deviceId, type, amount, balanceAfter, note, createdAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [txId, a.agentId, a.deviceId, 'PACKAGE_CREDIT', a.balance, a.balance, 'Initial Seed Package Credit', now, 'SYNCED']
      );
    }
  }



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
    centralServerUrl: 'https://central-bingo-atlas.internal/api/sync',
    centerFreeText: 'FREE',
  };

  const setRes = await runQuery("SELECT COUNT(*) as count FROM system_settings WHERE key = 'app_config'");
  if (setRes.length === 0 || setRes[0].count === 0) {
    await runExecute('INSERT INTO system_settings (key, value, updatedAt) VALUES (?, ?, ?)', [
      'app_config',
      JSON.stringify(defaultSettings),
      new Date().toISOString(),
    ]);
  }
}

export async function getAllCards(): Promise<BingoCard[]> {
  const rows = await runQuery('SELECT * FROM bingo_cards ORDER BY cardId ASC');
  return rows.map((obj: any) => ({
    cardId: obj.cardId,
    bNumbers: JSON.parse(obj.bNumbers),
    iNumbers: JSON.parse(obj.iNumbers),
    nNumbers: JSON.parse(obj.nNumbers),
    gNumbers: JSON.parse(obj.gNumbers),
    oNumbers: JSON.parse(obj.oNumbers),
    status: obj.status,
    createdAt: obj.createdAt,
  }));
}

export async function getCardById(cardId: string): Promise<BingoCard | null> {
  const rows = await runQuery('SELECT * FROM bingo_cards WHERE UPPER(cardId) = ?', [cardId.toUpperCase().trim()]);
  if (rows.length === 0) return null;
  const obj = rows[0];
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

export async function insertBatchCards(cards: BingoCard[]): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  let duplicates = 0;

  for (const c of cards) {
    try {
      await runExecute(
        'INSERT INTO bingo_cards (cardId, bNumbers, iNumbers, nNumbers, gNumbers, oNumbers, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          c.cardId,
          JSON.stringify(c.bNumbers),
          JSON.stringify(c.iNumbers),
          JSON.stringify(c.nNumbers),
          JSON.stringify(c.gNumbers),
          JSON.stringify(c.oNumbers),
          c.status,
          c.createdAt,
        ]
      );
      inserted++;
    } catch (e) {
      duplicates++;
    }
  }

  return { inserted, duplicates };
}

export async function deleteCard(cardId: string): Promise<boolean> {
  await runExecute('DELETE FROM bingo_cards WHERE UPPER(cardId) = ?', [cardId.toUpperCase()]);
  return true;
}

export async function getAllAgents(): Promise<Agent[]> {
  const rows = await runQuery('SELECT * FROM agents ORDER BY agentId ASC');
  return rows.map((obj: any) => {
    let parsedPackage = undefined;
    if (obj.packageAssigned) {
      try {
        parsedPackage = JSON.parse(obj.packageAssigned);
      } catch (e) {}
    }
    return {
      agentId: obj.agentId,
      name: obj.name,
      username: obj.username || undefined,
      location: obj.location,
      phone: obj.phone,
      pin: obj.pin,
      balance: Number(obj.balance),
      packageAssigned: parsedPackage,
      deviceId: obj.deviceId,
      status: obj.status || 'ACTIVE',
      banReason: obj.banReason || undefined,
      createdAt: obj.createdAt,
      lastSync: obj.lastSync,
    };
  });
}

export async function getAgentById(agentId: string): Promise<Agent | null> {
  const rows = await runQuery('SELECT * FROM agents WHERE UPPER(agentId) = ?', [agentId.toUpperCase().trim()]);
  if (rows.length === 0) return null;
  const obj = rows[0];
  let parsedPackage = undefined;
  if (obj.packageAssigned) {
    try {
      parsedPackage = JSON.parse(obj.packageAssigned);
    } catch (e) {}
  }
  return {
    agentId: obj.agentId,
    name: obj.name,
    username: obj.username || undefined,
    location: obj.location,
    phone: obj.phone,
    pin: obj.pin,
    balance: Number(obj.balance),
    packageAssigned: parsedPackage,
    deviceId: obj.deviceId,
    status: obj.status || 'ACTIVE',
    banReason: obj.banReason || undefined,
    createdAt: obj.createdAt,
    lastSync: obj.lastSync,
  };
}

export async function createAgent(agent: Agent): Promise<Agent> {
  const packageStr = agent.packageAssigned ? JSON.stringify(agent.packageAssigned) : null;
  await runExecute(
    'INSERT OR REPLACE INTO agents (agentId, name, location, phone, pin, balance, deviceId, packageAssigned, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
    await runExecute(
      'INSERT INTO transactions (transactionId, agentId, deviceId, type, amount, balanceAfter, packageName, note, createdAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        txId,
        agent.agentId,
        agent.deviceId,
        'PACKAGE_CREDIT',
        agent.balance,
        agent.balance,
        agent.packageAssigned?.packageName || 'Initial Package',
        'Initial Agent Credit Allocation',
        agent.createdAt,
        'PENDING',
      ]
    );
  }

  return agent;
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
  const current = await getAgentById(agentId);
  if (!current) return null;

  const updated: Agent = { ...current, ...updates };

  await runExecute(
    `UPDATE agents SET name = ?, location = ?, phone = ?, pin = ?, deviceId = ?, status = ? WHERE UPPER(agentId) = ?`,
    [updated.name, updated.location, updated.phone, updated.pin, updated.deviceId, updated.status, agentId.toUpperCase()]
  );

  return updated;
}

export async function deleteAgent(agentId: string): Promise<boolean> {
  await runExecute('DELETE FROM agents WHERE UPPER(agentId) = ?', [agentId.toUpperCase()]);
  return true;
}

export async function setAgentStatus(agentId: string, status: 'ACTIVE' | 'BANNED' | 'SUSPENDED', banReason?: string): Promise<Agent | null> {
  const current = await getAgentById(agentId);
  if (!current) return null;

  await runExecute('UPDATE agents SET status = ? WHERE UPPER(agentId) = ?', [status, agentId.toUpperCase()]);

  current.status = status;
  current.banReason = banReason;
  return current;
}

export async function assignPackageToAgent(
  agentId: string,
  assignment: { packageName: string; credits: number; gamesAllowed: number; costPerGame?: number; price?: number },
  note?: string
): Promise<{ success: boolean; agent: Agent; transaction: Transaction }> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const costPerGame = assignment.costPerGame || 50;
  const newBalance = agent.balance + assignment.credits;
  const now = new Date().toISOString();
  const txId = uuidv4();

  const pkgAssignment = {
    packageName: assignment.packageName,
    credits: assignment.credits,
    gamesAllowed: assignment.gamesAllowed || Math.floor(assignment.credits / costPerGame),
    costPerGame,
    assignedAt: now,
    price: assignment.price,
  };

  await runExecute('UPDATE agents SET balance = ?, packageAssigned = ? WHERE UPPER(agentId) = ?', [
    newBalance,
    JSON.stringify(pkgAssignment),
    agentId.toUpperCase(),
  ]);

  const transaction: Transaction = {
    transactionId: txId,
    agentId: agent.agentId,
    deviceId: agent.deviceId,
    type: 'PACKAGE_CREDIT',
    amount: assignment.credits,
    balanceAfter: newBalance,
    packageName: assignment.packageName,
    note: note || `Package Assigned: ${assignment.packageName} (+${assignment.credits} CR for ${pkgAssignment.gamesAllowed} games)`,
    createdAt: now,
    syncStatus: 'PENDING',
  };

  await runExecute(
    'INSERT INTO transactions (transactionId, agentId, deviceId, type, amount, balanceAfter, packageName, note, createdAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [txId, agent.agentId, agent.deviceId, 'PACKAGE_CREDIT', assignment.credits, newBalance, assignment.packageName, transaction.note, now, 'PENDING']
  );

  await addToSyncQueue('TRANSACTION', txId, transaction);

  const updatedAgent = await getAgentById(agentId);
  return {
    success: true,
    agent: updatedAgent || { ...agent, balance: newBalance, packageAssigned: pkgAssignment },
    transaction,
  };
}

export async function adjustAgentCredit(
  agentId: string,
  amount: number,
  type: 'PACKAGE_CREDIT' | 'GAME_FEE' | 'REFUND' | 'ADJUSTMENT',
  note: string,
  gameId?: string,
  deviceId?: string
): Promise<{ success: boolean; transaction: Transaction; newBalance: number }> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const newBalance = agent.balance + amount;
  if (newBalance < 0 && type === 'GAME_FEE') {
    throw new Error(`Insufficient credit. Required: ${Math.abs(amount)}, Current Balance: ${agent.balance}`);
  }

  const transactionId = uuidv4();
  const now = new Date().toISOString();
  const effDeviceId = deviceId || agent.deviceId || 'DEV-PC-LOCAL';

  await runExecute('UPDATE agents SET balance = ? WHERE agentId = ?', [newBalance, agentId]);

  await runExecute(
    'INSERT INTO transactions (transactionId, agentId, deviceId, type, amount, balanceAfter, gameId, note, createdAt, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [transactionId, agentId, effDeviceId, type, amount, newBalance, gameId || null, note, now, 'PENDING']
  );

  const tx: Transaction = {
    transactionId,
    agentId,
    deviceId: effDeviceId,
    type,
    amount,
    balanceAfter: newBalance,
    gameId,
    note,
    createdAt: now,
    syncStatus: 'PENDING',
  };

  await addToSyncQueue('TRANSACTION', transactionId, tx);

  return { success: true, newBalance, transaction: tx };
}

export async function getTransactions(agentId?: string): Promise<Transaction[]> {
  const query = agentId
    ? 'SELECT * FROM transactions WHERE agentId = ? ORDER BY createdAt DESC'
    : 'SELECT * FROM transactions ORDER BY createdAt DESC';
  const params = agentId ? [agentId] : [];
  const rows = await runQuery(query, params);
  return rows.map((obj: any) => ({
    transactionId: obj.transactionId,
    agentId: obj.agentId,
    deviceId: obj.deviceId,
    type: obj.type,
    amount: Number(obj.amount),
    balanceAfter: Number(obj.balanceAfter),
    gameId: obj.gameId,
    packageName: obj.packageName || undefined,
    note: obj.note,
    createdAt: obj.createdAt,
    syncStatus: obj.syncStatus,
  }));
}

export async function saveGameRecord(game: Game): Promise<void> {
  await runExecute(
    `INSERT OR REPLACE INTO games (gameId, agentId, deviceId, calledNumbers, startTime, endTime, status, winnerCardId, winningPattern, gameCost, createdAt, syncStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.gameId,
      game.agentId,
      game.deviceId,
      JSON.stringify(game.calledNumbers),
      game.startTime,
      game.endTime || null,
      game.status,
      game.winnerCardId || null,
      game.winningPattern || null,
      game.gameCost,
      game.createdAt,
      game.syncStatus,
    ]
  );

  await addToSyncQueue('GAME', game.gameId, game);
}

export async function getAllGames(agentId?: string): Promise<Game[]> {
  const query = agentId
    ? 'SELECT * FROM games WHERE agentId = ? ORDER BY createdAt DESC'
    : 'SELECT * FROM games ORDER BY createdAt DESC';
  const params = agentId ? [agentId] : [];
  const rows = await runQuery(query, params);
  return rows.map((obj: any) => ({
    gameId: obj.gameId,
    agentId: obj.agentId,
    deviceId: obj.deviceId,
    calledNumbers: JSON.parse(obj.calledNumbers || '[]'),
    calledDetails: [],
    startTime: obj.startTime,
    endTime: obj.endTime,
    status: obj.status,
    winnerCardId: obj.winnerCardId,
    winningPattern: obj.winningPattern,
    gameCost: Number(obj.gameCost || 0),
    createdAt: obj.createdAt,
    syncStatus: obj.syncStatus,
  }));
}

export async function recordWinner(winner: WinnerRecord): Promise<void> {
  await runExecute(
    `INSERT INTO winners (winnerId, gameId, cardId, agentId, pattern, matchedNumbers, verifiedAt, prizeAmount, prizeNotes, syncStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      winner.winnerId,
      winner.gameId,
      winner.cardId,
      winner.agentId,
      winner.pattern,
      JSON.stringify(winner.matchedNumbers),
      winner.verifiedAt,
      winner.prizeAmount || null,
      winner.prizeNotes || null,
      winner.syncStatus,
    ]
  );

  await addToSyncQueue('WINNER', winner.winnerId, winner);
}

export async function getAllWinners(): Promise<WinnerRecord[]> {
  const rows = await runQuery('SELECT * FROM winners ORDER BY verifiedAt DESC');
  return rows.map((obj: any) => ({
    winnerId: obj.winnerId,
    gameId: obj.gameId,
    cardId: obj.cardId,
    agentId: obj.agentId,
    pattern: obj.pattern,
    matchedNumbers: JSON.parse(obj.matchedNumbers || '[]'),
    verifiedAt: obj.verifiedAt,
    prizeAmount: obj.prizeAmount ? Number(obj.prizeAmount) : undefined,
    prizeNotes: obj.prizeNotes,
    syncStatus: obj.syncStatus,
  }));
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const rows = await runQuery("SELECT value FROM system_settings WHERE key = 'app_config'");
  if (rows.length === 0) {
    return {
      gameCost: 50,
      companyName: 'EilaBingo Community Network',
      locationName: 'Offline District Ops',
      currencySymbol: 'CR',
      autoSyncIntervalSec: 300,
      voiceAnnounceEnabled: true,
      allowedPatterns: ['ANY_LINE', 'HORIZONTAL_LINE', 'VERTICAL_LINE', 'DIAGONAL_LINE', 'FOUR_CORNERS', 'POSTAGE_STAMP', 'PLUS_CROSS', 'FULL_CARD_BLACKOUT'],
      centralServerUrl: 'https://central-bingo-atlas.internal/api/sync',
      centerFreeText: 'FREE',
    };
  }
  return JSON.parse(rows[0].value);
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  await runExecute("INSERT OR REPLACE INTO system_settings (key, value, updatedAt) VALUES ('app_config', ?, ?)", [
    JSON.stringify(settings),
    new Date().toISOString(),
  ]);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const rows = await runQuery("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY createdAt ASC");
  return rows.map((obj: any) => ({
    syncId: obj.syncId,
    recordType: obj.recordType,
    recordId: obj.recordId,
    payload: JSON.parse(obj.payload || '{}'),
    status: obj.status,
    retryCount: Number(obj.retryCount),
    lastAttempt: obj.lastAttempt,
    createdAt: obj.createdAt,
    error: obj.error,
  }));
}

export async function addToSyncQueue(recordType: string, recordId: string, payload: any): Promise<void> {
  const now = new Date().toISOString();
  await runExecute(
    'INSERT OR REPLACE INTO sync_queue (syncId, recordType, recordId, payload, status, retryCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), recordType, recordId, JSON.stringify(payload), 'PENDING', 0, now]
  );
}

export async function markSyncedItems(syncedRecordIds: string[]): Promise<void> {
  if (syncedRecordIds.length === 0) return;
  const now = new Date().toISOString();

  for (const id of syncedRecordIds) {
    await runExecute("UPDATE sync_queue SET status = 'SYNCED', lastAttempt = ? WHERE recordId = ?", [now, id]);
    await runExecute("UPDATE transactions SET syncStatus = 'SYNCED' WHERE transactionId = ?", [id]);
    await runExecute("UPDATE games SET syncStatus = 'SYNCED' WHERE gameId = ?", [id]);
    await runExecute("UPDATE winners SET syncStatus = 'SYNCED' WHERE winnerId = ?", [id]);
  }
}
