import React from 'react';
import { BingoCard } from '../types/bingo';
import { cardToMatrix } from '../utils/bingoEngine';

interface FixedCardViewProps {
  card: BingoCard;
  calledNumbers?: number[];
  winningIndices?: [number, number][];
  onSelect?: () => void;
  compact?: boolean;
}

export const FixedCardView: React.FC<FixedCardViewProps> = ({
  card,
  calledNumbers = [],
  winningIndices = [],
  onSelect,
  compact = false,
}) => {
  const matrix = cardToMatrix(card);
  const calledSet = new Set(calledNumbers);
  const winSet = new Set(winningIndices.map(([r, c]) => `${r},${c}`));

  const columns = ['B', 'I', 'N', 'G', 'O'] as const;
  const colColors = {
    B: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    I: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
    N: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    G: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    O: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg transition-all ${
        onSelect ? 'cursor-pointer hover:border-slate-500 hover:shadow-indigo-500/10' : ''
      } ${compact ? 'p-2 text-xs' : 'p-3'}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono font-bold text-amber-400 tracking-wider text-sm">
            {card.cardId}
          </span>
        </div>
        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          Fixed Card
        </span>
      </div>

      {/* B-I-N-G-O Letters */}
      <div className="grid grid-cols-5 gap-1 my-1.5 text-center font-black">
        {columns.map((letter) => (
          <div
            key={letter}
            className={`py-1 rounded font-mono text-xs border ${colColors[letter]}`}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 5x5 Grid */}
      <div className="grid grid-cols-5 gap-1">
        {matrix.map((row, r) =>
          row.map((val, c) => {
            const isFree = val === 'FREE';
            const isCalled = isFree || calledSet.has(val as number);
            const isWinning = winSet.has(`${r},${c}`);

            let cellBg = 'bg-slate-800/80 text-slate-200 border-slate-700/60';
            if (isWinning) {
              cellBg = 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300 shadow-md animate-pulse';
            } else if (isCalled) {
              cellBg = 'bg-emerald-700/90 text-white font-bold ring-1 ring-emerald-400/50 shadow-sm';
            }

            return (
              <div
                key={`${r}-${c}`}
                className={`flex items-center justify-center rounded border aspect-square select-none transition-all ${cellBg} ${
                  compact ? 'h-6 text-[10px]' : 'h-8 sm:h-9 text-xs sm:text-sm font-mono font-bold'
                }`}
              >
                {isFree ? (
                  <span className="text-[9px] font-black text-amber-300">★ FREE</span>
                ) : (
                  val
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 text-[9px] text-slate-500 text-center font-mono">
        PERMANENT PHYSICAL CARD NUMBERS (1-75)
      </div>
    </div>
  );
};
