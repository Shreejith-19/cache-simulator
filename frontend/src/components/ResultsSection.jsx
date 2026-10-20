import React, { useState, useMemo } from 'react';

export default function ResultsSection({ results }) {
  const [historyPage, setHistoryPage] = useState(1);
  const [filterType, setFilterType] = useState('all'); // 'all', 'hits', 'misses', 'evictions'
  const pageSize = 25;

  // Empty State
  if (!results) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 sm:p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto font-mono text-xl">
          0x
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-semibold text-slate-200">
            No Simulation Results Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Configure your cache dimensions and memory workload parameters above, then click <strong className="text-sky-400 font-semibold">Run Simulation</strong> to execute the C++ simulation core.
          </p>
        </div>
      </div>
    );
  }

  const { cacheConfig, statistics, timingAssumptions, accessHistory = [] } = results;

  // Filter access history
  const filteredHistory = useMemo(() => {
    if (filterType === 'hits') return accessHistory.filter((item) => item.hit);
    if (filterType === 'misses') return accessHistory.filter((item) => !item.hit);
    if (filterType === 'evictions') return accessHistory.filter((item) => item.eviction);
    return accessHistory;
  }, [accessHistory, filterType]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const currentPage = Math.min(historyPage, totalPages);

  const displayedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Hit Rate Card */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hit Rate</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            {statistics.hitRate.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {statistics.hits.toLocaleString()} hits
          </div>
        </div>

        {/* Miss Rate Card */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Miss Rate</span>
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400">
            {statistics.missRate.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {statistics.misses.toLocaleString()} misses
          </div>
        </div>

        {/* AMAT (Average Memory Access Time) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AMAT (Timing Model)</span>
            <span className="text-[10px] font-mono text-sky-400 px-1 py-0.5 rounded bg-sky-950/80 border border-sky-800/60">
              {timingAssumptions?.hitTimeNs ?? 1}ns + ({timingAssumptions?.additionalMissPenaltyNs ?? 50}ns)
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-300">
            {statistics.amatNs.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">ns</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Average Memory Access Time
          </div>
        </div>

        {/* Total Accesses & Evictions */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Accesses / Evictions</span>
            <span className="text-[10px] font-mono text-slate-400">
              Total {statistics.totalAccesses.toLocaleString()}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100">
            {statistics.evictions.toLocaleString()}{' '}
            <span className="text-xs font-normal text-amber-400">evictions</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {((statistics.evictions / (statistics.totalAccesses || 1)) * 100).toFixed(1)}% eviction rate
          </div>
        </div>
      </div>

      {/* Visual Hit/Miss Proportion Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-medium">Cache Access Ratio</span>
          <span className="font-mono text-[11px] text-slate-400">
            {statistics.hits.toLocaleString()} Hits ({statistics.hitRate.toFixed(1)}%) | {statistics.misses.toLocaleString()} Misses ({statistics.missRate.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            style={{ width: `${statistics.hitRate}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Hits: ${statistics.hitRate.toFixed(2)}%`}
          ></div>
          <div
            style={{ width: `${statistics.missRate}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Misses: ${statistics.missRate.toFixed(2)}%`}
          ></div>
        </div>
      </div>

      {/* 2. Educational Timing Model Metadata Banner */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          <span>Educational Timing Model Specification</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          AMAT calculated with assumptions: Cache Hit Time = <strong className="text-slate-300 font-mono">{timingAssumptions?.hitTimeNs ?? 1.0} ns</strong>, Additional Miss Penalty = <strong className="text-slate-300 font-mono">{timingAssumptions?.additionalMissPenaltyNs ?? 50.0} ns</strong>.
          <span className="italic opacity-80 block mt-0.5"> Note: {timingAssumptions?.notes}</span>
        </p>
      </div>

      {/* 3. Per-Access History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Per-Access History Trace</span>
              <span className="badge badge-sm font-mono bg-slate-800 text-sky-400 border border-slate-700">
                {filteredHistory.length.toLocaleString()} records
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect memory addresses, decoded set indices, tags, hit/miss detection, and evictions.
            </p>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {['all', 'hits', 'misses', 'evictions'].map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setHistoryPage(1);
                }}
                className={`px-2 py-1 rounded text-xs capitalize cursor-pointer transition-colors ${
                  filterType === type
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table table-xs w-full text-slate-300 font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5"># Access</th>
                <th>Address (Hex)</th>
                <th>Set Index</th>
                <th>Line Index</th>
                <th>Tag</th>
                <th>Result</th>
                <th>Eviction Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {displayedHistory.map((item) => (
                <tr key={item.accessIndex} className="hover:bg-slate-800/40 transition-colors">
                  <td className="text-slate-400 font-semibold">{item.accessIndex}</td>
                  <td>
                    <span className="text-sky-300 font-bold">{item.hexAddress}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal font-sans">
                      ({item.address})
                    </span>
                  </td>
                  <td>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                      Set {item.setIndex}
                    </span>
                  </td>
                  <td className="text-slate-400">Line {item.lineIndex}</td>
                  <td className="text-slate-300">{item.tag}</td>
                  <td>
                    {item.hit ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        HIT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        MISS
                      </span>
                    )}
                  </td>
                  <td>
                    {item.eviction ? (
                      <span className="text-amber-400 text-[11px]">
                        Evicted Tag: <code className="text-amber-300">{item.evictedTag}</code>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {displayedHistory.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400 text-xs font-sans">
                    No access records match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredHistory.length)} of{' '}
              {filteredHistory.length.toLocaleString()}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
              >
                Prev
              </button>
              <span className="px-2.5 py-1 text-slate-300 font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
