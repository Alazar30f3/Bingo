import React, { useState } from 'react';
import { BingoCard } from '../types/bingo';
import { api } from '../services/api';
import { FixedCardView } from './FixedCardView';
import { verifyBingoCard } from '../utils/bingoEngine';
import { Search, Sparkles, CheckCircle2, XCircle, CreditCard } from 'lucide-react';

interface PlayerCardCheckerProps {
  calledNumbers: number[];
  onClose?: () => void;
}

export const PlayerCardChecker: React.FC<PlayerCardCheckerProps> = ({
  calledNumbers,
  onClose,
}) => {
  const [cardId, setCardId] = useState('');
  const [card, setCard] = useState<BingoCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (idToLookup?: string) => {
    const q = (idToLookup || cardId).trim().toUpperCase();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.getCardById(q);
      if (!res.success) {
        setError(res.error || `Card ${q} not found`);
        setCard(null);
      } else {
        setCard(res.card);
      }
    } catch (e: any) {
      setError(e.message || 'Lookup error');
    } finally {
      setLoading(false);
    }
  };

  const verification = card ? verifyBingoCard(card, calledNumbers) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-400" />
          <h4 className="font-bold text-slate-100 text-xs sm:text-sm">
            Player Physical Card Self-Check
          </h4>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {calledNumbers.length} Called in Game
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={cardId}
            onChange={(e) => setCardId(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup();
            }}
            placeholder="Type Card ID (e.g. CARD-0001)"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-slate-100 font-mono text-xs uppercase"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </div>
        <button
          onClick={() => handleLookup()}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
        >
          Check
        </button>
      </div>

      {error && (
        <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {card && verification && (
        <div className="space-y-3 pt-2">
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              verification.isValid
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {verification.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              )}
              <span className="font-bold">
                {verification.isValid
                  ? `★ BINGO! (${verification.winningPatterns[0]?.patternName})`
                  : `${verification.totalMatched} / 24 Numbers Matched`}
              </span>
            </div>
            <span className="font-mono text-[11px]">{card.cardId}</span>
          </div>

          <div className="max-w-xs mx-auto">
            <FixedCardView
              card={card}
              calledNumbers={calledNumbers}
              winningIndices={verification.winningPatterns.flatMap((p) => p.winningIndices)}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
};
