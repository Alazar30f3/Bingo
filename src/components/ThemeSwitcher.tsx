import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ThemeSwitcherProps {
  variant?: 'pill' | 'button';
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ variant = 'pill', className = '' }) => {
  const { theme, toggleTheme, setTheme, isNight } = useTheme();
  const { t } = useLanguage();

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition flex items-center gap-1.5 ${
          isNight
            ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm'
        } ${className}`}
        title={isNight ? t('lightMode') : t('nightMode')}
        aria-label="Toggle light/night theme"
      >
        {isNight ? (
          <>
            <Sun className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">{t('light')}</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">{t('night')}</span>
          </>
        )}
      </button>
    );
  }

  // Segmented dual pill
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl border text-xs font-semibold transition ${
        isNight
          ? 'bg-slate-950 border-slate-800'
          : 'bg-slate-100 border-slate-200'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          !isNight
            ? 'bg-emerald-600 text-white shadow-sm font-bold'
            : 'text-slate-400 hover:text-white'
        }`}
        title={t('lightMode')}
      >
        <Sun className="w-3.5 h-3.5" />
        <span>{t('light')}</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('night')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
          isNight
            ? 'bg-emerald-600 text-white shadow-sm font-bold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title={t('nightMode')}
      >
        <Moon className="w-3.5 h-3.5" />
        <span>{t('night')}</span>
      </button>
    </div>
  );
};
