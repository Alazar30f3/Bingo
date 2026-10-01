export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'AGENT' | 'CALLER';

export type AgentStatus = 'ACTIVE' | 'BANNED' | 'SUSPENDED';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export type TransactionType = 'PACKAGE_CREDIT' | 'GAME_FEE' | 'REFUND' | 'ADJUSTMENT';

export type WinningPatternType = 
  | 'ANY_LINE'
  | 'HORIZONTAL_LINE'
  | 'VERTICAL_LINE'
  | 'DIAGONAL_LINE'
  | 'FOUR_CORNERS'
  | 'POSTAGE_STAMP'
  | 'PLUS_CROSS'
  | 'FULL_CARD_BLACKOUT';

export interface BingoCard {
  cardId: string; // e.g. "CARD-0001"
  bNumbers: number[]; // 5 numbers in 1-15
  iNumbers: number[]; // 5 numbers in 16-30
  nNumbers: (number | 'FREE')[]; // 5 items: [num, num, 'FREE', num, num] in 31-45
  gNumbers: number[]; // 5 numbers in 46-60
  oNumbers: number[]; // 5 numbers in 61-75
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  qrCodeData?: string;
}

export interface CalledNumberRecord {
  number: number;
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  order: number;
  calledAt: string;
}

export interface Game {
  gameId: string; // UUID or GAME-xxxx
  agentId: string;
  deviceId: string;
  calledNumbers: number[]; // array of numbers 1-75 in call order
  calledDetails: CalledNumberRecord[];
  startTime: string;
  endTime?: string;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  gamerCount?: number;
  capturedNumbers?: number[];
  capturedCards?: string[];
  winnerCardId?: string;
  winningPattern?: string;
  gameCost: number; // credits deducted
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface WinnerRecord {
  winnerId: string;
  gameId: string;
  cardId: string;
  agentId: string;
  pattern: string;
  matchedNumbers: number[];
  verifiedAt: string;
  prizeAmount?: number;
  prizeNotes?: string;
  syncStatus: SyncStatus;
}

export interface Transaction {
  transactionId: string; // UUID
  agentId: string;
  deviceId: string;
  type: TransactionType;
  amount: number; // positive for topup, negative for game fee
  balanceAfter: number;
  gameId?: string;
  packageName?: string;
  note?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface AgentPackageAssignment {
  packageName: string;
  credits: number;
  gamesAllowed: number;
  costPerGame: number;
  assignedAt: string;
  price?: number;
}

export interface Agent {
  agentId: string; // e.g. "AGENT-101"
  name: string;
  username?: string;
  location: string;
  phone: string;
  pin: string;
  balance: number; // Current credit balance
  packageAssigned?: AgentPackageAssignment;
  deviceId: string;
  status: AgentStatus;
  banReason?: string;
  createdAt: string;
  lastSync?: string;
}

export interface BingoPackage {
  id: string;
  name: string;
  credits: number;
  gamesCount: number;
  gamesAllowed?: number;
  price: number;
  description: string;
  badge?: string;
  popular?: boolean;
}

export const PRESET_PACKAGES: BingoPackage[] = [
  {
    id: 'starter',
    name: 'Starter Package',
    credits: 500,
    gamesCount: 10,
    price: 25,
    description: '10 Game Sessions (50 CR / game)',
    badge: 'Basic',
  },
  {
    id: 'bronze',
    name: 'Bronze Host Package',
    credits: 1250,
    gamesCount: 25,
    price: 60,
    description: '25 Game Sessions (50 CR / game)',
    badge: 'Popular',
    popular: true,
  },
  {
    id: 'silver',
    name: 'Silver Club Package',
    credits: 2500,
    gamesCount: 50,
    price: 110,
    description: '50 Game Sessions (50 CR / game)',
    badge: 'Best Value',
  },
  {
    id: 'gold',
    name: 'Gold Festival Package',
    credits: 5000,
    gamesCount: 100,
    price: 200,
    description: '100 Game Sessions (50 CR / game)',
    badge: 'Mega Tier',
  },
];

export interface AuthUser {
  id: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'AGENT';
  name: string;
  username?: string;
  agent?: Agent;
}

export interface DeviceInfo {
  deviceId: string;
  agentId: string;
  deviceName: string;
  appVersion: string;
  lastSync: string;
  isOnline: boolean;
  platform: string;
}

export interface SyncQueueItem {
  syncId: string;
  recordType: 'TRANSACTION' | 'GAME' | 'WINNER' | 'CARD' | 'AGENT';
  recordId: string;
  payload: any;
  status: SyncStatus;
  retryCount: number;
  lastAttempt?: string;
  createdAt: string;
  error?: string;
}

export interface SystemSettings {
  gameCost: number; // Default 50 credits per game
  companyName: string;
  locationName: string;
  currencySymbol: string;
  autoSyncIntervalSec: number;
  voiceAnnounceEnabled: boolean;
  allowedPatterns: WinningPatternType[];
  centralServerUrl: string;
  centerFreeText: string; // "FREE"
}

export interface VerificationResult {
  isValid: boolean;
  isLate?: boolean;
  latestCalledNumber?: number;
  cardId: string;
  winningPatterns: {
    pattern: WinningPatternType;
    patternName: string;
    winningIndices: [number, number][]; // [row, col]
  }[];
  matchedNumbers: number[];
  unmatchedNumbers: number[];
  totalMatched: number;
  matrix: {
    letter: 'B' | 'I' | 'N' | 'G' | 'O';
    row: number;
    col: number;
    value: number | 'FREE';
    isCalled: boolean;
    isWinningCell: boolean;
  }[][];
}
