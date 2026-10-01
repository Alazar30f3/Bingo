import { BingoCard, VerificationResult, WinningPatternType } from '../types/bingo';

export const BINGO_COLUMNS = {
  B: { min: 1, max: 15, name: 'B' as const },
  I: { min: 16, max: 30, name: 'I' as const },
  N: { min: 31, max: 45, name: 'N' as const },
  G: { min: 46, max: 60, name: 'G' as const },
  O: { min: 61, max: 75, name: 'O' as const },
};

/**
 * Returns letter corresponding to a number 1-75
 */
export function getBingoLetter(num: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  throw new Error(`Invalid Bingo number: ${num}. Must be between 1 and 75.`);
}

/**
 * Generates unique random integers in range [min, max]
 */
function getRandomNumbers(count: number, min: number, max: number): number[] {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) {
    pool.push(i);
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

/**
 * Generates a single fixed Bingo card.
 * Once created, this card's numbers are permanent.
 */
export function generateFixedBingoCard(cardId: string): BingoCard {
  const bNumbers = getRandomNumbers(5, 1, 15);
  const iNumbers = getRandomNumbers(5, 16, 30);
  const nRaw = getRandomNumbers(4, 31, 45);
  // Place FREE in center (index 2)
  const nNumbers: (number | 'FREE')[] = [
    nRaw[0],
    nRaw[1],
    'FREE',
    nRaw[2],
    nRaw[3],
  ];
  const gNumbers = getRandomNumbers(5, 46, 60);
  const oNumbers = getRandomNumbers(5, 61, 75);

  return {
    cardId,
    bNumbers,
    iNumbers,
    nNumbers,
    gNumbers,
    oNumbers,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a batch of fixed Bingo cards (e.g. CARD-0001 to CARD-0100)
 */
export function generateBatchFixedCards(
  count: number,
  startNumber: number = 1,
  prefix: string = 'CARD-'
): BingoCard[] {
  const cards: BingoCard[] = [];
  for (let i = 0; i < count; i++) {
    const num = startNumber + i;
    const padded = String(num).padStart(4, '0');
    const cardId = `${prefix}${padded}`;
    cards.push(generateFixedBingoCard(cardId));
  }
  return cards;
}

/**
 * Convert a BingoCard to a 5x5 grid (row-major)
 * Row 0: [B0, I0, N0, G0, O0]
 * Row 1: [B1, I1, N1, G1, O1]
 * Row 2: [B2, I2, FREE, G2, O2]
 * Row 3: [B3, I3, N2, G3, O3]
 * Row 4: [B4, I4, N3, G4, O4]
 */
export function cardToMatrix(card: BingoCard): (number | 'FREE')[][] {
  const matrix: (number | 'FREE')[][] = [];
  for (let row = 0; row < 5; row++) {
    matrix.push([
      card.bNumbers[row],
      card.iNumbers[row],
      card.nNumbers[row],
      card.gNumbers[row],
      card.oNumbers[row],
    ]);
  }
  return matrix;
}

/**
 * Verifies a Bingo card against a list of called numbers.
 * Supports standard patterns: Line (Horizontal, Vertical, Diagonal), 4 Corners, Postage Stamp, Plus, and Blackout.
 */
export function verifyBingoCard(
  card: BingoCard,
  calledNumbers: number[],
  allowedPatterns: WinningPatternType[] = [
    'ANY_LINE',
    'HORIZONTAL_LINE',
    'VERTICAL_LINE',
    'DIAGONAL_LINE',
    'FOUR_CORNERS',
    'POSTAGE_STAMP',
    'PLUS_CROSS',
    'FULL_CARD_BLACKOUT',
  ]
): VerificationResult {
  const calledSet = new Set(calledNumbers);
  const rawMatrix = cardToMatrix(card);

  // 5x5 boolean grid of called status
  const hitGrid: boolean[][] = [];
  const matchedList: number[] = [];
  const unmatchedList: number[] = [];

  for (let r = 0; r < 5; r++) {
    const rowHits: boolean[] = [];
    for (let c = 0; c < 5; c++) {
      const val = rawMatrix[r][c];
      if (val === 'FREE') {
        rowHits.push(true);
      } else {
        const isHit = calledSet.has(val);
        rowHits.push(isHit);
        if (isHit) {
          matchedList.push(val);
        } else {
          unmatchedList.push(val);
        }
      }
    }
    hitGrid.push(rowHits);
  }

  const winningPatterns: {
    pattern: WinningPatternType;
    patternName: string;
    winningIndices: [number, number][];
  }[] = [];

  const winningCellsSet = new Set<string>();

  // 1. Check Horizontal Lines (Rows 0-4)
  for (let r = 0; r < 5; r++) {
    let rowComplete = true;
    const indices: [number, number][] = [];
    for (let c = 0; c < 5; c++) {
      indices.push([r, c]);
      if (!hitGrid[r][c]) {
        rowComplete = false;
      }
    }
    if (rowComplete) {
      indices.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
      winningPatterns.push({
        pattern: 'HORIZONTAL_LINE',
        patternName: `Horizontal Line (Row ${r + 1})`,
        winningIndices: indices,
      });
    }
  }

  // 2. Check Vertical Lines (Cols 0-4 / B, I, N, G, O)
  const colNames = ['B', 'I', 'N', 'G', 'O'];
  for (let c = 0; c < 5; c++) {
    let colComplete = true;
    const indices: [number, number][] = [];
    for (let r = 0; r < 5; r++) {
      indices.push([r, c]);
      if (!hitGrid[r][c]) {
        colComplete = false;
      }
    }
    if (colComplete) {
      indices.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
      winningPatterns.push({
        pattern: 'VERTICAL_LINE',
        patternName: `Vertical Line (Column ${colNames[c]})`,
        winningIndices: indices,
      });
    }
  }

  // 3. Check Diagonals
  // Top-Left to Bottom-Right
  let diag1 = true;
  const diag1Indices: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    diag1Indices.push([i, i]);
    if (!hitGrid[i][i]) diag1 = false;
  }
  if (diag1) {
    diag1Indices.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
    winningPatterns.push({
      pattern: 'DIAGONAL_LINE',
      patternName: 'Diagonal (Top-Left to Bottom-Right ↘)',
      winningIndices: diag1Indices,
    });
  }

  // Top-Right to Bottom-Left
  let diag2 = true;
  const diag2Indices: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    diag2Indices.push([i, 4 - i]);
    if (!hitGrid[i][4 - i]) diag2 = false;
  }
  if (diag2) {
    diag2Indices.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
    winningPatterns.push({
      pattern: 'DIAGONAL_LINE',
      patternName: 'Diagonal (Top-Right to Bottom-Left ↙)',
      winningIndices: diag2Indices,
    });
  }

  // 4. Check Four Corners
  const corners: [number, number][] = [
    [0, 0],
    [0, 4],
    [4, 0],
    [4, 4],
  ];
  const cornersComplete = corners.every(([r, c]) => hitGrid[r][c]);
  if (cornersComplete) {
    corners.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
    winningPatterns.push({
      pattern: 'FOUR_CORNERS',
      patternName: 'Four Corners',
      winningIndices: corners,
    });
  }

  // 5. Check Postage Stamp (2x2 square in any of the 4 corners)
  const stampOffsets: [number, number][] = [
    [0, 0], // Top Left
    [0, 3], // Top Right
    [3, 0], // Bottom Left
    [3, 3], // Bottom Right
  ];
  const stampNames = ['Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'];

  stampOffsets.forEach(([baseR, baseC], idx) => {
    const stampCells: [number, number][] = [
      [baseR, baseC],
      [baseR, baseC + 1],
      [baseR + 1, baseC],
      [baseR + 1, baseC + 1],
    ];
    if (stampCells.every(([r, c]) => hitGrid[r][c])) {
      stampCells.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
      winningPatterns.push({
        pattern: 'POSTAGE_STAMP',
        patternName: `Postage Stamp (2x2 ${stampNames[idx]})`,
        winningIndices: stampCells,
      });
    }
  });

  // 6. Check Plus / Cross (Row 2 and Col 2)
  let plusComplete = true;
  const plusCells: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    plusCells.push([2, i]);
    plusCells.push([i, 2]);
    if (!hitGrid[2][i] || !hitGrid[i][2]) {
      plusComplete = false;
    }
  }
  if (plusComplete) {
    plusCells.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
    winningPatterns.push({
      pattern: 'PLUS_CROSS',
      patternName: 'Plus Cross (+ Pattern)',
      winningIndices: plusCells,
    });
  }

  // 7. Check Full Card (Blackout)
  let allHits = true;
  const allCells: [number, number][] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      allCells.push([r, c]);
      if (!hitGrid[r][c]) {
        allHits = false;
      }
    }
  }
  if (allHits) {
    allCells.forEach(([rr, cc]) => winningCellsSet.add(`${rr},${cc}`));
    winningPatterns.push({
      pattern: 'FULL_CARD_BLACKOUT',
      patternName: 'Full Card Blackout (Coverall 24/24)',
      winningIndices: allCells,
    });
  }

  // Build matrix with full UI annotation
  const matrix = rawMatrix.map((row, r) =>
    row.map((val, c) => {
      const isCalled = val === 'FREE' || hitGrid[r][c];
      const isWinningCell = winningCellsSet.has(`${r},${c}`);
      return {
        letter: colNames[c] as 'B' | 'I' | 'N' | 'G' | 'O',
        row: r,
        col: c,
        value: val,
        isCalled,
        isWinningCell,
      };
    })
  );

  // Filter against allowed patterns
  const filteredWinningPatterns = winningPatterns.filter((wp) => {
    if (allowedPatterns.includes('ANY_LINE')) {
      if (
        wp.pattern === 'HORIZONTAL_LINE' ||
        wp.pattern === 'VERTICAL_LINE' ||
        wp.pattern === 'DIAGONAL_LINE'
      ) {
        return true;
      }
    }
    return allowedPatterns.includes(wp.pattern);
  });

  // Determine if this is a "LATE BINGO" (completed on an earlier ball, not the latest called ball)
  const latestCalledNumber = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : undefined;
  let hasCurrentBallWinner = false;
  if (filteredWinningPatterns.length > 0 && latestCalledNumber !== undefined) {
    for (const wp of filteredWinningPatterns) {
      const patternContainsLatest = wp.winningIndices.some(([r, c]) => {
        const val = rawMatrix[r][c];
        return val === latestCalledNumber;
      });
      if (patternContainsLatest) {
        hasCurrentBallWinner = true;
        break;
      }
    }
  }

  const isLate = filteredWinningPatterns.length > 0 && !hasCurrentBallWinner;

  return {
    isValid: filteredWinningPatterns.length > 0,
    isLate,
    latestCalledNumber,
    cardId: card.cardId,
    winningPatterns: filteredWinningPatterns,
    matchedNumbers: matchedList,
    unmatchedNumbers: unmatchedList,
    totalMatched: matchedList.length,
    matrix,
  };
}
