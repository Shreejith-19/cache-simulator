import React from 'react';

export default function WorkloadPanel({ workload, onChange }) {
  const { workloadType, numberOfAccesses, randomSeed } = workload;

  const presetAccesses = [100, 500, 1000, 2500, 5000, 10000];

  const handleRandomizeSeed = () => {
    const nextSeed = Math.floor(Math.random() * 900000) + 100000;
    onChange('randomSeed', nextSeed);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          Workload Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Select access pattern and memory trace size for the simulation.
        </p>
      </div>

      {/* Workload Pattern Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300">
          Access Pattern
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange('workloadType', 'sequential')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              workloadType === 'sequential'
                ? 'bg-sky-500/10 border-sky-500/60 text-slate-100'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="text-xs font-semibold">Sequential</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Strictly incrementing 4-byte addresses
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange('workloadType', 'random')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              workloadType === 'random'
                ? 'bg-sky-500/10 border-sky-500/60 text-slate-100'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="text-xs font-semibold">Random</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Reproducible pseudo-random addresses
            </div>
          </button>
        </div>
      </div>

      {/* Pattern Explanation Callout */}
      {workloadType === 'sequential' ? (
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1 font-mono">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px]">
            <span>[Pattern]</span> Address Stride
          </div>
          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Generates aligned 4-byte byte addresses: <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">0, 4, 8, 12, 16, ...</code> demonstrating sequential block fills and high spatial locality.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300" htmlFor="seed-input">
              Reproducible Random Seed
            </label>
            <button
              type="button"
              onClick={handleRandomizeSeed}
              className="text-[11px] text-sky-400 hover:text-sky-300 underline font-mono cursor-pointer"
            >
              Generate New Seed
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="seed-input"
              type="number"
              className="input input-sm bg-slate-900 border-slate-700 text-slate-200 text-xs font-mono w-full focus:border-sky-500 focus:outline-none"
              value={randomSeed}
              onChange={(e) => onChange('randomSeed', Number(e.target.value) || 0)}
              min="1"
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Generates reproducible 4-byte aligned addresses using C++ <code className="text-sky-300 font-mono">std::mt19937_64</code> seeded with {randomSeed}.
          </p>
        </div>
      )}

      {/* Access Count Slider */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300" htmlFor="access-slider">
            Number of Memory Accesses
          </label>
          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/50 border border-sky-800/60 px-2 py-0.5 rounded">
            {numberOfAccesses.toLocaleString()} accesses
          </span>
        </div>

        <input
          id="access-slider"
          type="range"
          min="100"
          max="10000"
          step="100"
          value={numberOfAccesses}
          onChange={(e) => onChange('numberOfAccesses', Number(e.target.value))}
          className="range range-xs range-primary w-full bg-slate-800"
        />

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
          <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
          <div className="flex gap-1.5">
            {presetAccesses.map((count) => (
              <button
                type="button"
                key={count}
                onClick={() => onChange('numberOfAccesses', count)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                  numberOfAccesses === count
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                }`}
              >
                {count >= 1000 ? `${count / 1000}k` : count}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
