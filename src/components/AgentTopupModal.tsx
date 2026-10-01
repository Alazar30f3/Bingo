import React, { useState } from 'react';
import { Agent } from '../types/bingo';
import { api } from '../services/api';
import { Coins, PlusCircle, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface AgentTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSuccess: () => void;
}

export const AgentTopupModal: React.FC<AgentTopupModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { isNight } = useTheme();
  const isAmharic = language === 'am';

  const [amount, setAmount] = useState<string>('1000');
  const [note, setNote] = useState<string>('Weekly Agent Credit Package Allocation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !agent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      setError(isAmharic ? 'እባክዎ ትክክለኛ የክሬዲት መጠን ያስገቡ' : 'Please enter a positive credit amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.topupAgent(agent.agentId, num, note);
      if (!res.success) {
        setError(res.error || (isAmharic ? 'ክሬዲት መመደብ አልተሳካም' : 'Failed to top up agent credit'));
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || (isAmharic ? 'የአገልጋይ ግንኙነት ስህተት' : 'Error communicating with server'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fadeIn">
      <div className={`border rounded-3xl max-w-md w-full shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Pinned Header */}
        <div className={`flex items-center justify-between p-5 border-b shrink-0 ${
          isNight ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isNight ? 'text-white' : 'text-slate-900'}`}>{t('quickCreditTopup')}</h3>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('agentNameLabel')}: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{agent.name}</span> ({agent.agentId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition cursor-pointer ${
              isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outer Form with Pinned Footer and Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto max-h-[calc(92vh-145px)] flex-1 min-h-0">
            {/* Current Balance */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isNight ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={isNight ? 'text-slate-400' : 'text-slate-600'}>{t('currentAgentBalance')}:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{agent.balance} CR</span>
            </div>

            {/* Quick preset buttons */}
            <div>
              <label className={`block font-medium mb-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('quickPackageAmounts')}:</label>
              <div className="grid grid-cols-4 gap-2">
                {['500', '1000', '2500', '5000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`py-1.5 rounded-lg font-mono font-bold border transition cursor-pointer ${
                      amount === preset
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : isNight
                        ? 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block font-medium mb-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('customCreditAmount')}:</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 font-mono font-bold text-sm outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block font-medium mb-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('auditNoteReason')}:</label>
              <input
                type="text"
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Pinned Footer */}
          <div className={`flex items-center justify-end gap-2 p-4 border-t shrink-0 ${
            isNight ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                isNight ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? t('allocating') : t('confirmAllocation')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
