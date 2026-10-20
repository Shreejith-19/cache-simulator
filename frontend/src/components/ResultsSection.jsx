import React from 'react';
import MetricCards from './MetricCards';
import HitMissDistribution from './HitMissDistribution';
import ConfigurationSummary from './ConfigurationSummary';
import AmatExplanation from './AmatExplanation';
import TraceHistoryTable from './TraceHistoryTable';

export default function ResultsSection({ results, isUpdating }) {
  // 1. Empty State
  if (!results) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 sm:p-14 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto font-mono text-2xl shadow-inner">
          0x
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-semibold text-slate-100">
            No Simulation Results Yet
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure your cache dimensions and memory workload parameters above, then click{' '}
            <strong className="text-sky-400 font-semibold">Run Simulation</strong> to execute the C++ simulation core.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap justify-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            C++20 Simulation Core
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            Hardware-Aligned Addresses
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            AMAT Latency Model
          </span>
        </div>
      </div>
    );
  }

  const {
    cacheConfig,
    workloadConfig,
    statistics,
    timingAssumptions,
    accessHistory = [],
  } = results;

  return (
    <div className="space-y-6 relative transition-opacity">
      {/* Simulation Update In-Progress Banner */}
      {isUpdating && (
        <div className="sticky top-16 z-30 p-3 rounded-lg bg-sky-950/90 border border-sky-500/50 backdrop-blur-md shadow-lg flex items-center justify-between text-xs text-sky-200 animate-pulse">
          <div className="flex items-center gap-2 font-mono">
            <span className="loading loading-spinner loading-xs text-sky-300"></span>
            <span>Running new simulation in C++ backend... Previous results displayed below.</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-900 border border-sky-700 text-sky-200">
            In Progress
          </span>
        </div>
      )}

      {/* 1. Summary Metric Cards */}
      <MetricCards
        statistics={statistics}
        timingAssumptions={timingAssumptions}
      />

      {/* 2. Visualizations & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Recharts Hit/Miss Distribution */}
        <HitMissDistribution statistics={statistics} />

        {/* Configuration Summary */}
        <ConfigurationSummary
          cacheConfig={cacheConfig}
          workloadConfig={workloadConfig}
        />
      </div>

      {/* 3. AMAT Timing Model Explanation */}
      <AmatExplanation
        statistics={statistics}
        timingAssumptions={timingAssumptions}
      />

      {/* 4. Per-Access History Table */}
      <TraceHistoryTable accessHistory={accessHistory} />
    </div>
  );
}
