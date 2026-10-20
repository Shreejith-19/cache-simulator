import React from 'react';

export default function Header({ backendStatus, onRetryHealth }) {
  const isOnline = backendStatus.state === 'online';
  const isLoading = backendStatus.state === 'loading';

  return (
    <header className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50 px-4 sm:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Logo and Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-black text-sm tracking-tighter shadow-sm">
            CPU
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                CPU Cache Simulator
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700/80 font-medium">
                C++20 Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">
              Explore cache behavior through configurable memory workloads.
            </p>
          </div>
        </div>

        {/* Backend Status Indicator */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isLoading ? (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Connecting to backend...</span>
            </div>
          ) : isOnline ? (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Backend Connected (port 8080)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Backend Offline</span>
              <button
                type="button"
                onClick={onRetryHealth}
                className="ml-1 underline hover:text-white transition-colors cursor-pointer"
                title="Retry connecting to C++ backend"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
