import React from 'react';

export default function CacheConfigPanel({ config, onChange }) {
  const {
    capacityBytes,
    lineSizeBytes,
    mappingStrategy,
    associativity,
    replacementPolicy,
  } = config;

  // Capacity options: 1, 2, 4, 8, 16, 32 KiB
  const capacityOptions = [
    { value: 1024, label: '1 KiB (1,024 B)' },
    { value: 2048, label: '2 KiB (2,048 B)' },
    { value: 4096, label: '4 KiB (4,096 B)' },
    { value: 8192, label: '8 KiB (8,192 B)' },
    { value: 16384, label: '16 KiB (16,384 B)' },
    { value: 32768, label: '32 KiB (32,768 B)' },
  ];

  // Line size options: 16, 32, 64, 128 bytes
  const lineSizeOptions = [
    { value: 16, label: '16 Bytes' },
    { value: 32, label: '32 Bytes' },
    { value: 64, label: '64 Bytes' },
    { value: 128, label: '128 Bytes' },
  ];

  // Mapping strategies
  const mappingStrategies = [
    { id: 'DirectMapped', label: 'Direct-Mapped', desc: '1 line per set' },
    { id: 'SetAssociative', label: 'Set-Associative', desc: 'N lines per set' },
    { id: 'FullyAssociative', label: 'Fully Associative', desc: '1 single set' },
  ];

  // Associativity options for Set-Associative
  const associativityOptions = [2, 4, 8];

  // Derived Geometry Calculations
  const totalLines = lineSizeBytes > 0 ? Math.floor(capacityBytes / lineSizeBytes) : 0;
  
  let effectiveAssoc = 1;
  let numSets = 1;

  if (mappingStrategy === 'DirectMapped') {
    effectiveAssoc = 1;
    numSets = totalLines;
  } else if (mappingStrategy === 'FullyAssociative') {
    effectiveAssoc = totalLines;
    numSets = 1;
  } else {
    effectiveAssoc = associativity;
    numSets = (lineSizeBytes * associativity > 0)
      ? Math.floor(capacityBytes / (lineSizeBytes * associativity))
      : 1;
  }

  // Address Bit Breakdown
  const offsetBits = Math.round(Math.log2(lineSizeBytes));
  const indexBits = numSets > 1 ? Math.round(Math.log2(numSets)) : 0;
  const tagBits = 64 - offsetBits - indexBits;

  // Validation warning (e.g. if capacity < line_size * associativity in Set-Associative)
  const isGeometryValid = capacityBytes >= lineSizeBytes * effectiveAssoc;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Cache Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure physical cache dimensions, associativity, and replacement strategy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cache Capacity Dropdown */}
        <div className="form-control">
          <label className="label text-xs font-medium text-slate-300 py-1" htmlFor="capacity-select">
            Cache Capacity
          </label>
          <select
            id="capacity-select"
            className="select select-bordered select-sm bg-slate-950 border-slate-700 text-slate-200 text-xs w-full focus:border-sky-500 focus:outline-none"
            value={capacityBytes}
            onChange={(e) => onChange('capacityBytes', Number(e.target.value))}
          >
            {capacityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cache Line Size Dropdown */}
        <div className="form-control">
          <label className="label text-xs font-medium text-slate-300 py-1" htmlFor="linesize-select">
            Cache Line Size (Block Size)
          </label>
          <select
            id="linesize-select"
            className="select select-bordered select-sm bg-slate-950 border-slate-700 text-slate-200 text-xs w-full focus:border-sky-500 focus:outline-none"
            value={lineSizeBytes}
            onChange={(e) => onChange('lineSizeBytes', Number(e.target.value))}
          >
            {lineSizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mapping Strategy Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300">
          Mapping Strategy
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {mappingStrategies.map((strategy) => {
            const isSelected = mappingStrategy === strategy.id;
            return (
              <button
                type="button"
                key={strategy.id}
                onClick={() => onChange('mappingStrategy', strategy.id)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/60 text-slate-100 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <span className="text-xs font-semibold">{strategy.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{strategy.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Associativity Selector (Visible ONLY for Set-Associative) */}
        {mappingStrategy === 'SetAssociative' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Set Associativity (Ways per Set)
            </label>
            <div className="flex gap-2">
              {associativityOptions.map((ways) => {
                const isSelected = associativity === ways;
                return (
                  <button
                    type="button"
                    key={ways}
                    onClick={() => onChange('associativity', ways)}
                    className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500/80 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {ways}-Way
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 opacity-60">
            <label className="text-xs font-medium text-slate-400">
              Associativity (Derived)
            </label>
            <div className="p-2 rounded-md bg-slate-950/40 border border-slate-800/80 text-slate-400 text-xs font-mono">
              {mappingStrategy === 'DirectMapped'
                ? '1-Way (1 line per set)'
                : `${totalLines}-Way (all lines in 1 set)`}
            </div>
          </div>
        )}

        {/* Replacement Policy Selector (Disabled for Direct-Mapped) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Replacement Policy
            </label>
            {mappingStrategy === 'DirectMapped' && (
              <span className="text-[10px] text-slate-400 font-mono italic">
                Disabled (1 line/set)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {['LRU', 'FIFO'].map((policy) => {
              const isDisabled = mappingStrategy === 'DirectMapped';
              const isSelected = replacementPolicy === policy;
              return (
                <button
                  type="button"
                  key={policy}
                  disabled={isDisabled}
                  onClick={() => onChange('replacementPolicy', policy)}
                  className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                    isDisabled
                      ? 'bg-slate-950/40 border-slate-800/60 text-slate-400 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-sky-500/20 border-sky-500/80 text-sky-300 cursor-pointer'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  {policy}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Derived Geometry Card */}
      <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/90 space-y-2">
        <div className="text-[11px] uppercase font-mono font-semibold text-slate-400 tracking-wider flex items-center justify-between">
          <span>Derived Cache Geometry</span>
          {!isGeometryValid && (
            <span className="text-rose-400 font-normal">Invalid Geometry (Capacity &lt; Line Size &times; Ways)</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px]">TOTAL LINES</div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">{totalLines.toLocaleString()}</div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px]">CACHE SETS</div>
            <div className="text-sky-400 font-bold text-sm mt-0.5">{numSets.toLocaleString()}</div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px]">WAYS / SET</div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">{effectiveAssoc}</div>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <div className="text-slate-400 text-[10px]">BYTES / SET</div>
            <div className="text-slate-100 font-bold text-sm mt-0.5">{(lineSizeBytes * effectiveAssoc).toLocaleString()} B</div>
          </div>
        </div>

        {/* Address Bit Decomposition breakdown */}
        <div className="pt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
          <span className="text-slate-400 text-[10px] uppercase">64-bit Address:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800">
            Tag: {tagBits} bits
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-indigo-400 border border-slate-800">
            Index: {indexBits} bits
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-800">
            Offset: {offsetBits} bits
          </span>
        </div>
      </div>
    </div>
  );
}
