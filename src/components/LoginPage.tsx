import React, { useState } from 'react';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, Key } from 'lucide-react';
import { AuthUser } from '../types/bingo';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const { isNight } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (userToLogin: string, passToLogin: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({
        username: userToLogin.trim(),
        password: passToLogin.trim(),
      });

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError('Invalid username or password'); 
      }
    } catch (err: any) {
      setError(err?.message || 'Login request failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
    
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('fillBothFields'));
      return;
    }
    await performLogin(username, password);
  };

  const handleQuickLogin = (quickUser: string, quickPass: string) => {
    setUsername(quickUser);
    setPassword(quickPass);
    performLogin(quickUser, quickPass);
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-4 py-12 relative transition-colors duration-200 ${
        isNight ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* Top right language & theme switches */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        <ThemeSwitcher variant="pill" />
        <LanguageSwitcher variant="pill" />
      </div>

      <div className="w-full max-w-sm">
        {/* App Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl shadow-lg shadow-emerald-600/30 mb-3 ring-4 ring-emerald-500/20">
            75
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${isNight ? 'text-white' : 'text-slate-900'}`}>
            {t('appTitle')}
          </h1>
          <p className={`text-xs mt-1 ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('signInToContinue')}
          </p>
        </div>

        {/* Login Card */}
        <div
          className={`rounded-3xl p-6 sm:p-7 shadow-xl border transition-colors ${
            isNight
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200 shadow-slate-200/50'
          }`}
        >
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('enterUsername')}
                  className={`w-full rounded-xl py-3 pl-10 pr-3.5 text-sm transition font-sans outline-none ${
                    isNight
                      ? 'bg-slate-950 border border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isNight ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('enterPassword')}
                  className={`w-full rounded-xl py-3 pl-10 pr-3.5 text-sm transition font-sans outline-none ${
                    isNight
                      ? 'bg-slate-950 border border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{t('signingIn')}</span>
              ) : (
                <>
                  <span>{t('signIn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

         
        </div>
      </div>
    </div>
  );
};
