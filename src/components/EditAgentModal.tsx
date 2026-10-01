import React, { useState, useEffect } from 'react';
import { Agent } from '../types/bingo';
import { api } from '../services/api';
import { UserCog, X, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSuccess: () => void;
}

export const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { isNight } = useTheme();
  const isAmharic = language === 'am';

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setLocation(agent.location || '');
      setPhone(agent.phone || '');
      setPin(agent.pin || '1234');
      setDeviceId(agent.deviceId || '');
      setError(null);
    }
  }, [agent]);

  if (!isOpen || !agent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.updateAgent(agent.agentId, {
        name,
        location,
        phone,
        pin,
        deviceId,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || (isAmharic ? 'የወኪል መረጃ ማሻሻል አልተሳካም።' : 'Failed to update agent.'));
      }
    } catch (err: any) {
      setError(err?.message || (isAmharic ? 'የኔትወርክ ስህተት ተከስቷል' : 'Network error updating agent'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fadeIn">
      <div className={`border rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden transition-colors ${
        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Pinned Header */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
          isNight ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base ${isNight ? 'text-white' : 'text-slate-900'}`}>{t('editAgentDetails')}</h3>
              <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{agent.agentId}</p>
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-145px)] flex-1 min-h-0 text-xs">
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 text-rose-200 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('agentNameLabel')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('townshipLocation')}
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('contactPhone')}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-xs outline-none transition focus:border-emerald-500 ${
                    isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t('pinCode')}
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  className={`w-full border rounded-xl p-3 text-xs outline-none transition focus:border-emerald-500 font-mono text-center tracking-widest ${
                    isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('hardwareDeviceId')}
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className={`w-full border rounded-xl p-3 text-xs outline-none transition focus:border-emerald-500 font-mono ${
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
              {loading ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
