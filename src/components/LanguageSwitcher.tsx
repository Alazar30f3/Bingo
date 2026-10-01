import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'full' | 'pill';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-amber-400 hover:text-amber-300 transition ${className}`}
        title="Switch Language / ቋንቋ ቀይር (English / አማርኛ)"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>{language === 'en' ? '🇪🇹 አማርኛ' : '🇬🇧 EN'}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
          language === 'en'
            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
        title="English"
      >
        <span className="text-xs">🇬🇧</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('am')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
          language === 'am'
            ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
            : 'text-slate-400 hover:text-white'
        }`}
        title="አማርኛ (Amharic)"
      >
        <span className="text-xs">🇪🇹</span>
        <span className="font-bold">አማርኛ</span>
      </button>
    </div>
  );
};
