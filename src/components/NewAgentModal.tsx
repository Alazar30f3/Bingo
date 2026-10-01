import React, { useState } from 'react';
import { api } from '../services/api';
import { Agent, PRESET_PACKAGES, BingoPackage } from '../types/bingo';
import { UserPlus, CheckCircle2, AlertTriangle, X, Package } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface NewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agent: Agent) => void;
}

export const NewAgentModal: React.FC<NewAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const { isNight } = useTheme();
  const isAmharic = language === 'am';

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [selectedPackage, setSelectedPackage] = useState<BingoPackage>(PRESET_PACKAGES[1]); // Standard
  const [deviceId, setDeviceId] = useState(`DEV-PC-${Math.floor(100 + Math.random() * 900)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isAmharic ? 'የወኪል ስም ማስገባት ግዴታ ነው' : 'Agent name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.createAgent({
        name,
        location: location || 'Township Hall',
        phone,
        pin,
        balance: selectedPackage.credits,
        packageAssigned: {
          packageName: selectedPackage.name,
          credits: selectedPackage.credits,
          gamesAllowed: selectedPackage.gamesAllowed,
          costPerGame: 50,
          assignedAt: new Date().toISOString(),
          price: selectedPackage.price,
        },
        deviceId,
        status: 'ACTIVE',
      });

      if (!res.success) {
        setError(res.error || (isAmharic ? 'ወኪል መመዝገብ አልተሳካም' : 'Failed to create agent'));
      } else {
        onSuccess(res.agent);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || (isAmharic ? 'የአገልጋይ ስህተት ተከስቷል' : 'Server error creating agent'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen animate-fadeIn">
      <div className={`border rounded-3xl max-w-lg w-full shadow-2xl relative my-auto max-h-[92vh] flex flex-col transition-colors overflow-hidden ${
        isNight ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Pinned Header */}
        <div className={`flex items-center justify-between p-5 border-b shrink-0 ${
          isNight ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-extrabold ${isNight ? 'text-white' : 'text-slate-900'}`}>{t('registerNewAgent')}</h3>
              <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>{t('registerNewAgentDesc')}</p>
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
          {/* Scrollable Form Body with explicit max-height and smooth scrolling */}
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[calc(92vh-145px)] p-5 sm:p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className={`block font-bold mb-1 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('agentNameLabel')}:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAmharic ? 'ለምሳሌ ሳሙኤል ከበደ፣ ምዕራብ አዳራሽ' : 'e.g. Samuel K., West Village Hall'}
                className={`w-full border rounded-xl px-3 py-2.5 outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block font-bold mb-1 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('townshipLocation')}:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isAmharic ? 'ለምሳሌ ጎንደር ማዕከል' : 'e.g. Pine Creek Community Center'}
                className={`w-full border rounded-xl px-3 py-2.5 outline-none transition focus:border-emerald-500 ${
                  isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block font-bold mb-1 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('contactPhone')}:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 900 000000"
                  className={`w-full border rounded-xl px-3 py-2.5 outline-none transition focus:border-emerald-500 ${
                    isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block font-bold mb-1 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>{t('pinCode')}:</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 font-mono text-center font-bold tracking-widest outline-none transition focus:border-emerald-500 ${
                    isNight ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Initial Package Picker */}
            <div>
              <label className={`block font-bold mb-1.5 flex items-center gap-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('initialPackageAssignment')}:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.id === pkg.id;
                  const gamesCount = pkg.gamesCount || pkg.gamesAllowed || Math.floor(pkg.credits / 50);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-white font-bold shadow-sm'
                          : isNight
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span>{pkg.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 font-bold">
                        {pkg.credits} CR ({gamesCount} {t('games')})
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-[11px] flex items-center justify-between ${
              isNight ? 'bg-slate-950 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <span>{t('hardwareDeviceId')}:</span>
              <span className={`font-mono font-bold ${isNight ? 'text-slate-200' : 'text-slate-800'}`}>{deviceId}</span>
            </div>
          </div>

          {/* Pinned Footer with Action Buttons Always Visible */}
          <div className={`flex items-center justify-end gap-2.5 p-4 border-t shrink-0 ${
            isNight ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl transition cursor-pointer font-semibold ${
                isNight ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? t('registering') : t('registerAndAssign')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

