import React, { useState } from 'react';
import { Agent, PRESET_PACKAGES, BingoPackage } from '../types/bingo';
import { api } from '../services/api';
import { Package, ShieldAlert, CheckCircle2, Coins, Gamepad2, X, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface AssignPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSuccess: () => void;
}

export const AssignPackageModal: React.FC<AssignPackageModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { isNight } = useTheme();
  const isAmharic = language === 'am';

  const [selectedPreset, setSelectedPreset] = useState<BingoPackage | null>(PRESET_PACKAGES[1]); // Standard
  const [customPackageName, setCustomPackageName] = useState('');
  const [customCredits, setCustomCredits] = useState<number>(1000);
  const [customGames, setCustomGames] = useState<number>(20);
  const [customPrice, setCustomPrice] = useState<number>(50);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !agent) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let packageName = selectedPreset ? selectedPreset.name : (customPackageName || 'Custom Bingo Package');
      let credits = selectedPreset ? selectedPreset.credits : customCredits;
      let gamesAllowed = selectedPreset 
        ? (selectedPreset.gamesAllowed || selectedPreset.gamesCount || Math.floor(credits / 50)) 
        : customGames;
      let price = selectedPreset ? selectedPreset.price : customPrice;

      const res = await api.assignPackage(agent.agentId, {
        packageName,
        credits,
        gamesAllowed,
        price,
        note: note || `Admin assigned ${packageName} to ${agent.agentId}`,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || (isAmharic ? 'ጥቅሉን መመደብ አልተሳካም።' : 'Failed to assign package.'));
      }
    } catch (err: any) {
      setError(err?.message || (isAmharic ? 'የኔትወርክ ስህተት ተከስቷል' : 'Network error while assigning package'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fadeIn">
      <div className={`border rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden transition-colors ${
        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Pinned Header */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
          isNight ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base ${isNight ? 'text-white' : 'text-slate-900'}`}>{t('assignGamePackage')}</h3>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('agentNameLabel')}: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{agent.agentId}</span> ({agent.name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outer Form with Pinned Footer and Scrollable Body */}
        <form onSubmit={handleAssign} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body with max-h constraint so overflow scrolling always works */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-145px)] flex-1 min-h-0 text-xs">
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Balance & Active Package Status */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
              isNight ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className={`block text-[11px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>{t('currentAgentBalance')}:</span>
                <span className={`font-extrabold text-base ${isNight ? 'text-white' : 'text-slate-900'}`}>{agent.balance} CR</span>
              </div>
              <div className="text-right">
                <span className={`block text-[11px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>{t('playableGames')}:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ~{Math.floor(agent.balance / (agent.packageAssigned?.costPerGame || 50))} {t('games')}
                </span>
              </div>
            </div>

            {/* Select Preset Packages */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('choosePackageTier')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_PACKAGES.map((pkg) => {
                  const isSelected = selectedPreset?.id === pkg.id;
                  const gamesCount = pkg.gamesCount || pkg.gamesAllowed || Math.floor(pkg.credits / 50);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPreset(pkg)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-white shadow-sm font-bold'
                          : isNight
                          ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-extrabold text-sm">{pkg.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">+{pkg.credits} CR</span>
                        <span className={`text-[11px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>{gamesCount} {t('games')}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">${pkg.price} USD</span>
                    </button>
                  );
                })}

                {/* Custom Package Option */}
                <button
                  type="button"
                  onClick={() => setSelectedPreset(null)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    selectedPreset === null
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-white shadow-sm font-bold'
                      : isNight
                      ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-extrabold text-sm">{t('customPackage')}</span>
                    {selectedPreset === null && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <span className={`text-[11px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>{t('manualCreditsGames')}</span>
                </button>
              </div>
            </div>

            {/* Custom Package Inputs if Custom Selected */}
            {selectedPreset === null && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label className={`block text-[11px] font-bold mb-1 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>{t('packageName')}</label>
                  <input
                    type="text"
                    value={customPackageName}
                    onChange={(e) => setCustomPackageName(e.target.value)}
                    placeholder={isAmharic ? 'ለምሳሌ የበዓል ልዩ ጥቅል' : 'e.g. Festival Special Package'}
                    className={`w-full border rounded-xl p-2.5 text-xs outline-none transition focus:border-emerald-500 ${
                      isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>{t('credits')} (+CR)</label>
                    <input
                      type="number"
                      value={customCredits}
                      onChange={(e) => setCustomCredits(Number(e.target.value))}
                      min={50}
                      step={50}
                      className={`w-full border rounded-xl p-2.5 text-xs outline-none transition focus:border-emerald-500 ${
                        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>{t('gamesAllowed')}</label>
                    <input
                      type="number"
                      value={customGames}
                      onChange={(e) => setCustomGames(Number(e.target.value))}
                      min={1}
                      className={`w-full border rounded-xl p-2.5 text-xs outline-none transition focus:border-emerald-500 ${
                        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('allocationNote')} ({t('cancel') === 'Cancel' ? 'Optional' : 'አማራጭ'})
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isAmharic ? 'ለምሳሌ የሳምንት ምደባ ዙር #4' : 'e.g. Weekly township allocation batch #4'}
                className={`w-full border rounded-xl p-3 text-xs outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Pinned Footer with Action Buttons Always Visible */}
          <div className={`flex items-center justify-end gap-3 p-4 border-t shrink-0 ${
            isNight ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isNight ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>{loading ? t('assigningPackage') : t('confirmPackageAssignment')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

