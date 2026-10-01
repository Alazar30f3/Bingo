import React, { useState } from 'react';
import { BingoCard } from '../types/bingo';
import { exportBingoCardsToPDF, PDFExportOptions } from '../utils/pdfGenerator';
import { FixedCardView } from './FixedCardView';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Scissors,
  CheckSquare,
  Sparkles,
  X,
  Palette,
  Layers,
} from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: BingoCard[];
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  cards,
}) => {
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2 | 4 | 6>(4);
  const [colorScheme, setColorScheme] = useState<'classic-red' | 'navy' | 'emerald' | 'grayscale'>('classic-red');
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [companyName, setCompanyName] = useState<string>('RURAL BINGO SYSTEM');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.min(50, cards.length || 50));
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter cards by selected range
  const filteredCards = cards.filter((c) => {
    const num = parseInt(c.cardId.replace(/\D/g, ''), 10);
    return num >= rangeStart && num <= rangeEnd;
  });

  const handleExportPDF = () => {
    if (filteredCards.length === 0) return;
    setIsExporting(true);
    setExportSuccess(null);

    try {
      const filename = exportBingoCardsToPDF(filteredCards, {
        cardsPerPage,
        colorScheme,
        showCutLines,
        companyName,
      });
      setExportSuccess(`Successfully generated and downloaded: ${filename}`);
    } catch (err: any) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Physical Bingo Cards PDF & Print Studio
              </h3>
              <p className="text-xs text-slate-400">
                Generate high-resolution printable sheets for players with fixed permanent numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 text-xs overflow-y-auto flex-1 pr-1">
          {/* Left Column: Configuration */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Cards per Printable Sheet:</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {([1, 2, 4, 6] as const).map((count) => (
                  <button
                    key={count}
                    onClick={() => setCardsPerPage(count)}
                    className={`py-2 rounded-lg font-bold border transition ${
                      cardsPerPage === count
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {count} {count === 1 ? 'Card' : 'Cards'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {cardsPerPage === 4 ? '4 cards/page: Ideal 2x2 grid for standard village paper cutting' : ''}
                {cardsPerPage === 1 ? '1 card/page: Large high-visibility format for senior players' : ''}
                {cardsPerPage === 2 ? '2 cards/page: Side-by-side landscape layout' : ''}
                {cardsPerPage === 6 ? '6 cards/page: High-density economy print' : ''}
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                <span>Print Color Style:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'classic-red', label: 'Classic Red', color: 'bg-rose-700' },
                  { id: 'navy', label: 'Navy Blue', color: 'bg-blue-700' },
                  { id: 'emerald', label: 'Forest Green', color: 'bg-emerald-700' },
                  { id: 'grayscale', label: 'Ink Saver B&W', color: 'bg-slate-600' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setColorScheme(item.id as any)}
                    className={`p-2 rounded-lg flex items-center gap-2 border transition ${
                      colorScheme === item.id
                        ? 'bg-slate-800 text-white border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Card Range Start:</label>
                <input
                  type="number"
                  min={1}
                  max={cards.length || 1}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Card Range End:</label>
                <input
                  type="number"
                  min={rangeStart}
                  max={cards.length || 1000}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Header Label / Organization:</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
              />
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={showCutLines}
                onChange={(e) => setShowCutLines(e.target.checked)}
                className="rounded text-amber-500 bg-slate-900 border-slate-700 w-4 h-4"
              />
              <span className="flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                Include scissor cutting guides around each card
              </span>
            </label>
          </div>

          {/* Right Column: Live Card Preview */}
          <div className="flex flex-col justify-between space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">Live Card Sample Preview:</span>
                <span className="font-mono text-amber-400 text-[11px]">
                  {filteredCards.length} Cards Selected
                </span>
              </div>
              {filteredCards[0] ? (
                <div className="scale-95 origin-top">
                  <FixedCardView card={filteredCards[0]} />
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No cards in selected range
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-amber-400">Important EilaBingo Concept:</strong> Cards generated once are fixed forever. Players retain and reuse the physical card across all weekly sessions.
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {exportSuccess && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Total Sheets to Print:{' '}
            <strong className="text-slate-100 font-mono">
              {Math.ceil(filteredCards.length / cardsPerPage)} pages
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting || filteredCards.length === 0}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF Sheets'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
