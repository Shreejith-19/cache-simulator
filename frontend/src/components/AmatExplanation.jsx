import React from 'react';

export default function AmatExplanation({ statistics, timingAssumptions }) {
  if (!statistics) return null;

  const totalAccesses = Number(statistics.totalAccesses) || 0;
  const missRatePct = Number(statistics.missRate) || 0;
  const missRateFraction = totalAccesses > 0 ? (Number(statistics.misses) || 0) / totalAccesses : 0;
  const amatNs = Number(statistics.amatNs) || 0;

  const hitTimeNs = Number(timingAssumptions?.hitTimeNs) || 1.0;
  const penaltyNs = Number(timingAssumptions?.additionalMissPenaltyNs) || 50.0;
  const penaltyContribution = missRateFraction * penaltyNs;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Average Memory Access Time (AMAT) Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Analytical breakdown of effective latency based on cache hit rate and memory stall penalty.
          </p>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/60 text-sky-300 font-semibold">
          Educational Timing Model
        </span>
      </div>

      {/* Formula Card */}
      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
        <div className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
          Mathematical Formulation
        </div>
        <div className="p-3 bg-slate-900 rounded-md border border-slate-800 text-slate-200 text-sm overflow-x-auto text-center sm:text-left">
          <code className="text-sky-300 font-bold">AMAT</code> ={' '}
          <span className="text-emerald-300">Hit Time</span> + (
          <span className="text-rose-300">Miss Rate (fraction)</span> &times;{' '}
          <span className="text-amber-300">Additional Miss Penalty</span>)
        </div>

        {/* Value Substitution */}
        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-sans">Active Values:</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300">
              Hit Time: {hitTimeNs.toFixed(1)} ns
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-rose-300">
              Miss Rate: {missRateFraction.toFixed(4)} ({missRatePct.toFixed(2)}%)
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              Penalty: {penaltyNs.toFixed(1)} ns
            </span>
          </div>

          <div className="pt-2 text-slate-200 text-xs">
            <span className="text-slate-400 font-sans">Calculation: </span>
            <span className="text-sky-300 font-bold">{amatNs.toFixed(2)} ns</span> ={' '}
            {hitTimeNs.toFixed(1)} ns + ({missRateFraction.toFixed(4)} &times; {penaltyNs.toFixed(1)} ns) ={' '}
            {hitTimeNs.toFixed(1)} ns + {penaltyContribution.toFixed(2)} ns
          </div>
        </div>
      </div>

      {/* Educational Notice */}
      <div className="p-3.5 bg-sky-950/20 rounded-lg border border-sky-800/40 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-2 text-sky-400 font-semibold text-[11px]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Educational Disclaimer</span>
        </div>
        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
          {timingAssumptions?.notes ||
            'Configurable educational timing model assumptions; not measurements of real hardware.'}
          {' '}The reported {amatNs.toFixed(2)} ns AMAT is an analytical estimate based on assumed parameters, not physical CPU silicon latency.
        </p>
      </div>
    </div>
  );
}
