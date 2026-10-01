import React, { useState, useRef } from 'react';
import {
  Laptop,
  Database,
  Cloud,
  WifiOff,
  CheckCircle2,
  ShieldCheck,
  X,
  HardDrive,
  Download,
  Upload,
  FileCode,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';

interface ElectronInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ElectronInfoModal: React.FC<ElectronInfoModalProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ loading: boolean; message?: string; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleDownloadDb = () => {
    api.downloadSqliteDb();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true });
    try {
      const res = await api.importSqliteDb(file);
      if (res.success) {
        setImportStatus({ loading: false, message: 'SQLite database restored successfully! Page will refresh.' });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setImportStatus({ loading: false, error: res.error || 'Failed to import SQLite file' });
      }
    } catch (err: any) {
      setImportStatus({ loading: false, error: err.message || 'Error uploading file' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center min-h-screen animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Desktop PC & Offline SQLite Architecture
              </h3>
              <p className="text-xs text-slate-400">
                Designed for uninterrupted Bingo operation in zero-internet township halls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4 text-xs text-slate-300 overflow-y-auto flex-1 pr-1">
          {/* Offline SQLite Storage Section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Offline SQLite Database (.sqlite)</h4>
                  <span className="text-[11px] text-slate-400">Embedded WebAssembly SQLite (sql.js) • Zero internet required</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                100% Offline Ready
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              This web app runs SQLite locally inside the application runtime using <strong>sql.js</strong>. All fixed cards, games, credit ledgers, and transactions persist on disk at <code className="text-amber-400 font-mono">data/bingo_local.sqlite</code>.
            </p>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Note on React Native vs Web SQLite:</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                The package <code className="text-rose-400">react-native-sqlite-storage</code> is built specifically for native mobile smartphone apps (Android/iOS Xcode/Gradle). In modern Web and Desktop PC applications, <strong>sql.js (WebAssembly SQLite)</strong> is already embedded and delivers native offline performance without native mobile toolchains.
              </p>
            </div>

            {/* Action Buttons: Download and Import SQLite Database */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadDb}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Download SQLite DB (.sqlite)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Import SQLite DB (.sqlite)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".sqlite,.db,.sqlite3"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {importStatus && (
              <div
                className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs ${
                  importStatus.error
                    ? 'bg-rose-950/50 border-rose-800/40 text-rose-300'
                    : 'bg-emerald-950/50 border-emerald-800/40 text-emerald-300'
                }`}
              >
                {importStatus.error ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{importStatus.error || importStatus.message || 'Importing database...'}</span>
              </div>
            )}
          </div>

          {/* Architecture Diagram */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-slate-100 block">1. Local SQLite Engine</span>
                <span className="text-[11px] text-slate-400">
                  Fixed cards, games, and UUID ledger stored locally on PC
                </span>
              </div>
            </div>

            <div className="text-slate-600 font-mono text-sm hidden sm:block">───►</div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <WifiOff className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-slate-100 block">2. Offline Live Calling</span>
                <span className="text-[11px] text-slate-400">
                  Runs with 0 ms latency, 1s-8s auto call, no internet needed
                </span>
              </div>
            </div>

            <div className="text-slate-600 font-mono text-sm hidden sm:block">───►</div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-slate-100 block">3. Central Atlas Sync</span>
                <span className="text-[11px] text-slate-400">
                  Idempotent sync when connectivity returns
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Double-Charge Guarantee</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Every single game fee and package top-up generates a cryptographic UUID transaction. Even if the connection drops or retries 10 times, the Central MongoDB Atlas idempotency ledger applies it exactly once.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Fixed Reusable Cards</span>
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Physical paper cards are printed once and reused forever. The system never regenerates numbers during a game, allowing village players to keep their physical cards across years of community events.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
