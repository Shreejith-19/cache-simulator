import React from 'react';

export default function MetricCards({ statistics, timingAssumptions }) {
  if (!statistics) return null;

  const totalAccesses = Number(statistics.totalAccesses) || 0;
  const hits = Number(statistics.hits) || 0;
  const misses = Number(statistics.misses) || 0;
  const evictions = Number(statistics.evictions) || 0;
  const hitRate = Number(statistics.hitRate) || 0;
  const missRate = Number(statistics.missRate) || 0;
  const amatNs = Number(statistics.amatNs) || 0;

  const hitTimeNs = Number(timingAssumptions?.hitTimeNs) || 1.0;
  const penaltyNs = Number(timingAssumptions?.additionalMissPenaltyNs) || 50.0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Accesses */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
        <div className="text-xs text-slate-400 font-medium">Total Accesses</div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
          {totalAccesses.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">100% of workload</div>
      </div>

      {/* 2. Cache Hits */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Cache Hits</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
          {hits.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">Fast L1 hits</div>
      </div>

      {/* 3. Cache Misses */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Cache Misses</span>
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
          {misses.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 font-mono">Memory stall lookups</div>
      </div>

      {/* 4. Hit Rate */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
        <div className="text-xs text-slate-400 font-medium">Hit Rate</div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">
          {hitRate.toFixed(2)}%
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {totalAccesses > 0 ? `${hits}/${totalAccesses}` : '0/0'}
        </div>
      </div>

      {/* 5. Miss Rate */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
        <div className="text-xs text-slate-400 font-medium">Miss Rate</div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-rose-300">
          {missRate.toFixed(2)}%
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {totalAccesses > 0 ? `${misses}/${totalAccesses}` : '0/0'}
        </div>
      </div>

      {/* 6. AMAT (Average Memory Access Time) */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>AMAT</span>
          <span className="text-[10px] font-mono text-sky-400">ns</span>
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-sky-300">
          {amatNs.toFixed(2)} <span className="text-xs font-normal text-slate-400">ns</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono truncate" title={`Base: ${hitTimeNs}ns + Miss Penalty: ${penaltyNs}ns`}>
          Base: {hitTimeNs}ns + {penaltyNs}ns
        </div>
      </div>
    </div>
  );
}
