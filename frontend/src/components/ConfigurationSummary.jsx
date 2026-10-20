import React from 'react';

export default function ConfigurationSummary({ cacheConfig, workloadConfig }) {
  if (!cacheConfig || !workloadConfig) return null;

  const capacityKiB = (cacheConfig.capacityBytes / 1024).toFixed(0);
  const isDirect = cacheConfig.mappingStrategy === 'DirectMapped';
  const isFully = cacheConfig.mappingStrategy === 'FullyAssociative';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-800 pb-3">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          Active Configuration Summary
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Geometry parameters and workload context verified by backend.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
        {/* Capacity */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">CAPACITY</div>
          <div className="text-sm font-bold text-slate-100">
            {capacityKiB} KiB{' '}
            <span className="text-[11px] font-normal text-slate-400">
              ({cacheConfig.capacityBytes.toLocaleString()} B)
            </span>
          </div>
        </div>

        {/* Line Size */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">LINE / BLOCK SIZE</div>
          <div className="text-sm font-bold text-slate-100">
            {cacheConfig.lineSizeBytes} Bytes
          </div>
        </div>

        {/* Mapping Strategy */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">MAPPING STRATEGY</div>
          <div className="text-sm font-bold text-sky-400">
            {cacheConfig.mappingStrategy}
          </div>
        </div>

        {/* Associativity */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">ASSOCIATIVITY</div>
          <div className="text-sm font-bold text-slate-100">
            {isDirect ? '1-Way (Direct)' : isFully ? 'Fully Associative' : `${cacheConfig.associativity}-Way`}
          </div>
        </div>

        {/* Replacement Policy */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">REPLACEMENT POLICY</div>
          <div className="text-sm font-bold text-slate-100">
            {isDirect ? 'N/A (Direct-Mapped)' : cacheConfig.replacementPolicy}
          </div>
        </div>

        {/* Number of Sets */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">SETS & TOTAL LINES</div>
          <div className="text-sm font-bold text-indigo-400">
            {cacheConfig.numSets.toLocaleString()} sets{' '}
            <span className="text-[11px] text-slate-400 font-normal">
              ({cacheConfig.totalLines.toLocaleString()} lines)
            </span>
          </div>
        </div>

        {/* Workload Pattern */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">WORKLOAD PATTERN</div>
          <div className="text-sm font-bold text-emerald-400 capitalize">
            {workloadConfig.workloadType}
          </div>
        </div>

        {/* Access Count */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">TRACE ACCESSES</div>
          <div className="text-sm font-bold text-slate-100">
            {workloadConfig.numberOfAccesses.toLocaleString()} requests
          </div>
        </div>

        {/* Seed */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase">RANDOM SEED</div>
          <div className="text-sm font-bold text-slate-100">
            {workloadConfig.workloadType.toLowerCase() === 'random'
              ? workloadConfig.randomSeed
              : 'N/A (Sequential)'}
          </div>
        </div>
      </div>

      {/* Address Bit Breakdown */}
      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
        <span className="text-slate-400 text-[10px] uppercase">64-Bit Address Layout:</span>
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400">
          Tag: {cacheConfig.tagBits} bits
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400">
          Set Index: {cacheConfig.indexBits} bits
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400">
          Block Offset: {cacheConfig.offsetBits} bits
        </span>
      </div>
    </div>
  );
}
