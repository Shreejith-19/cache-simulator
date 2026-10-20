import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { runComparison } from '../services/api';

const PRESETS = [
  {
    name: 'Associativity Study',
    description: 'Direct vs 2-Way vs 4-Way vs 8-Way (4 KiB, 64 B line)',
    workload: { workloadType: 'random', numberOfAccesses: 1000, randomSeed: 42 },
    configs: [
      {
        id: 'cfg-direct',
        label: 'Direct-Mapped',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'DirectMapped',
        associativity: 1,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-2way',
        label: '2-Way Set-Assoc',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 2,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-4way',
        label: '4-Way Set-Assoc',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-8way',
        label: '8-Way Set-Assoc',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 8,
        replacementPolicy: 'LRU',
      },
    ],
  },
  {
    name: 'Line Size Trade-off',
    description: '16B vs 32B vs 64B vs 128B Line Size (4 KiB, 4-Way)',
    workload: { workloadType: 'sequential', numberOfAccesses: 1000, randomSeed: 42 },
    configs: [
      {
        id: 'cfg-line16',
        label: '16-Byte Line',
        capacityBytes: 4096,
        lineSizeBytes: 16,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-line32',
        label: '32-Byte Line',
        capacityBytes: 4096,
        lineSizeBytes: 32,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-line64',
        label: '64-Byte Line',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-line128',
        label: '128-Byte Line',
        capacityBytes: 4096,
        lineSizeBytes: 128,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
    ],
  },
  {
    name: 'Capacity Scaling',
    description: '1 KiB vs 2 KiB vs 4 KiB vs 8 KiB (4-Way, 64 B line)',
    workload: { workloadType: 'random', numberOfAccesses: 1000, randomSeed: 123 },
    configs: [
      {
        id: 'cfg-1k',
        label: '1 KiB Cache',
        capacityBytes: 1024,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-2k',
        label: '2 KiB Cache',
        capacityBytes: 2048,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-4k',
        label: '4 KiB Cache',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-8k',
        label: '8 KiB Cache',
        capacityBytes: 8192,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
    ],
  },
  {
    name: 'Replacement Policy',
    description: 'LRU vs FIFO Replacement (4 KiB, 4-Way)',
    workload: { workloadType: 'random', numberOfAccesses: 1000, randomSeed: 777 },
    configs: [
      {
        id: 'cfg-lru',
        label: '4-Way LRU',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'LRU',
      },
      {
        id: 'cfg-fifo',
        label: '4-Way FIFO',
        capacityBytes: 4096,
        lineSizeBytes: 64,
        mappingStrategy: 'SetAssociative',
        associativity: 4,
        replacementPolicy: 'FIFO',
      },
    ],
  },
];

export default function CompareSection() {
  // Shared Workload State
  const [workload, setWorkload] = useState({
    workloadType: 'random',
    numberOfAccesses: 1000,
    randomSeed: 42,
  });

  // Configurations list (bounded between 2 and 6)
  const [configs, setConfigs] = useState(PRESETS[0].configs);

  // Execution & Results State
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState('hitRate'); // 'hitRate' | 'amat'

  // Apply a preset
  const handleApplyPreset = (preset) => {
    setWorkload(preset.workload);
    setConfigs(preset.configs.map((c) => ({ ...c })));
    setComparisonResults(null);
    setErrorMessage(null);
  };

  // Add new configuration
  const handleAddConfig = () => {
    if (configs.length >= 6) return;
    const newIndex = configs.length + 1;
    const newConfig = {
      id: `cfg-${Date.now()}-${newIndex}`,
      label: `Config ${newIndex}`,
      capacityBytes: 4096,
      lineSizeBytes: 64,
      mappingStrategy: 'SetAssociative',
      associativity: 4,
      replacementPolicy: 'LRU',
    };
    setConfigs([...configs, newConfig]);
    setErrorMessage(null);
  };

  // Remove configuration
  const handleRemoveConfig = (idToRemove) => {
    if (configs.length <= 2) {
      setErrorMessage('A minimum of 2 configurations is required for comparison.');
      return;
    }
    setConfigs(configs.filter((c) => c.id !== idToRemove));
    setErrorMessage(null);
  };

  // Update a single configuration
  const handleUpdateConfig = (id, field, value) => {
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field === 'mappingStrategy') {
          if (value === 'DirectMapped') updated.associativity = 1;
          if (value === 'SetAssociative' && updated.associativity === 1) updated.associativity = 2;
        }
        return updated;
      })
    );
    setErrorMessage(null);
  };

  // Geometry helper
  const calculateGeometry = (cfg) => {
    const totalLines = Math.floor(cfg.capacityBytes / cfg.lineSizeBytes);
    let numSets = 1;
    if (cfg.mappingStrategy === 'DirectMapped') {
      numSets = totalLines;
    } else if (cfg.mappingStrategy === 'SetAssociative') {
      numSets = Math.floor(totalLines / (cfg.associativity || 1));
    } else {
      numSets = 1;
    }
    return { totalLines, numSets };
  };

  // Run Comparison Action
  const handleRunComparison = async () => {
    setErrorMessage(null);

    // Validation
    if (configs.length < 2 || configs.length > 6) {
      setErrorMessage('Please select between 2 and 6 configurations.');
      return;
    }

    for (let i = 0; i < configs.length; ++i) {
      const c = configs[i];
      if (c.capacityBytes < c.lineSizeBytes) {
        setErrorMessage(
          `Configuration "${c.label}": Capacity (${c.capacityBytes} B) cannot be smaller than line size (${c.lineSizeBytes} B).`
        );
        return;
      }
      if (c.mappingStrategy === 'SetAssociative') {
        const minCap = c.lineSizeBytes * c.associativity;
        if (c.capacityBytes < minCap) {
          setErrorMessage(
            `Configuration "${c.label}": Set-Associative requires capacity (${c.capacityBytes} B) >= line size × ways (${minCap} B).`
          );
          return;
        }
      }
    }

    if (workload.numberOfAccesses < 100 || workload.numberOfAccesses > 10000) {
      setErrorMessage('Workload access count must be between 100 and 10,000.');
      return;
    }

    setIsComparing(true);
    try {
      const payload = {
        workload: {
          workloadType: workload.workloadType,
          numberOfAccesses: workload.numberOfAccesses,
          randomSeed: workload.workloadType === 'random' ? workload.randomSeed : 42,
        },
        configurations: configs.map((c) => ({
          id: c.id,
          label: c.label,
          capacityBytes: c.capacityBytes,
          lineSizeBytes: c.lineSizeBytes,
          mappingStrategy: c.mappingStrategy,
          associativity: c.mappingStrategy === 'SetAssociative' ? c.associativity : 1,
          replacementPolicy: c.mappingStrategy === 'DirectMapped' ? 'LRU' : c.replacementPolicy,
        })),
      };

      const data = await runComparison(payload);
      setComparisonResults(data);
    } catch (err) {
      setErrorMessage(err.message || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  // Chart data preparation
  const chartData = comparisonResults?.comparisons?.map((c) => ({
    id: c.id,
    label: c.label,
    hitRate: Number(c.statistics.hitRate.toFixed(2)),
    missRate: Number(c.statistics.missRate.toFixed(2)),
    amatNs: Number(c.statistics.amatNs.toFixed(2)),
    hits: c.statistics.hits,
    misses: c.statistics.misses,
    isHighestHitRate: c.id === comparisonResults.analysis?.highestHitRateConfigId,
    isLowestAmat: c.id === comparisonResults.analysis?.lowestAmatConfigId,
  })) || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Banner & Preset Quick-Select */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono font-medium mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              Multi-Configuration Architectural Benchmark
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Compare Cache Configurations on the Same Workload
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Evaluate how variations in capacity, block size, associativity, and replacement policy
              perform when subjected to the <strong className="text-slate-200">exact same sequence of memory addresses</strong>.
            </p>
          </div>

          <button
            type="button"
            id="btn-run-comparison"
            disabled={isComparing}
            onClick={handleRunComparison}
            className={`px-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg whitespace-nowrap ${
              isComparing
                ? 'bg-sky-600/50 text-sky-200 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-[0.98]'
            }`}
          >
            {isComparing ? (
              <>
                <span className="loading loading-spinner loading-xs text-sky-200"></span>
                <span>Simulating Configurations...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>Compare Configurations</span>
              </>
            )}
          </button>
        </div>

        {/* Presets Row */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
            <span>Architectural Presets:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="p-3 text-left rounded-xl bg-slate-950/60 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/40 transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition-colors">
                  {p.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Shared Workload Configuration */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              1. Shared Workload Environment
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
            Generated Once in C++ Backend
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Workload Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Workload Pattern</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWorkload({ ...workload, workloadType: 'sequential' })}
                className={`py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all cursor-pointer ${
                  workload.workloadType === 'sequential'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Sequential (Streaming)
              </button>
              <button
                type="button"
                onClick={() => setWorkload({ ...workload, workloadType: 'random' })}
                className={`py-2 px-3 text-xs rounded-lg font-medium border text-center transition-all cursor-pointer ${
                  workload.workloadType === 'random'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Random (Scattered)
              </button>
            </div>
          </div>

          {/* Number of Accesses Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <label className="text-slate-400">Number of Accesses</label>
              <span className="text-sky-400 font-bold">
                {workload.numberOfAccesses.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={workload.numberOfAccesses}
              onChange={(e) =>
                setWorkload({ ...workload, numberOfAccesses: parseInt(e.target.value, 10) })
              }
              className="range range-xs range-info w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>100</span>
              <span>5,000</span>
              <span>10,000</span>
            </div>
          </div>

          {/* Random Seed */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Workload Seed (Reproducibility)</label>
            <input
              type="number"
              disabled={workload.workloadType !== 'random'}
              value={workload.randomSeed}
              onChange={(e) =>
                setWorkload({ ...workload, randomSeed: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 disabled:opacity-40"
              placeholder="e.g. 42"
            />
            <span className="text-[10px] text-slate-400 font-sans block">
              {workload.workloadType === 'random'
                ? 'Ensures deterministic address trace generation.'
                : 'Seed is inactive for deterministic sequential streaming.'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Configurations Manager */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              2. Configurations to Compare ({configs.length} of 6)
            </h3>
          </div>

          <button
            type="button"
            onClick={handleAddConfig}
            disabled={configs.length >= 6}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
              configs.length >= 6
                ? 'bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
            }`}
          >
            <span>+ Add Configuration</span>
          </button>
        </div>

        {/* Configuration Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((cfg, idx) => {
            const geom = calculateGeometry(cfg);
            return (
              <div
                key={cfg.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative space-y-3 shadow-sm hover:border-slate-700 transition-colors"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={cfg.label}
                      onChange={(e) => handleUpdateConfig(cfg.id, 'label', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-500 focus:bg-slate-950 text-xs font-bold text-slate-100 px-1 py-0.5 rounded w-full outline-none transition-colors"
                    />
                  </div>

                  {configs.length > 2 && (
                    <button
                      type="button"
                      title="Remove configuration"
                      onClick={() => handleRemoveConfig(cfg.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Form Controls */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Capacity */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Capacity
                    </label>
                    <select
                      value={cfg.capacityBytes}
                      onChange={(e) =>
                        handleUpdateConfig(cfg.id, 'capacityBytes', parseInt(e.target.value, 10))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none"
                    >
                      <option value={1024}>1 KiB</option>
                      <option value={2048}>2 KiB</option>
                      <option value={4096}>4 KiB</option>
                      <option value={8192}>8 KiB</option>
                      <option value={16384}>16 KiB</option>
                      <option value={32768}>32 KiB</option>
                    </select>
                  </div>

                  {/* Line Size */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Line Size
                    </label>
                    <select
                      value={cfg.lineSizeBytes}
                      onChange={(e) =>
                        handleUpdateConfig(cfg.id, 'lineSizeBytes', parseInt(e.target.value, 10))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none"
                    >
                      <option value={16}>16 B</option>
                      <option value={32}>32 B</option>
                      <option value={64}>64 B</option>
                      <option value={128}>128 B</option>
                    </select>
                  </div>

                  {/* Mapping Strategy */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Mapping
                    </label>
                    <select
                      value={cfg.mappingStrategy}
                      onChange={(e) => handleUpdateConfig(cfg.id, 'mappingStrategy', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none"
                    >
                      <option value="DirectMapped">Direct-Mapped</option>
                      <option value="SetAssociative">Set-Associative</option>
                      <option value="FullyAssociative">Fully Associative</option>
                    </select>
                  </div>

                  {/* Associativity */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Associativity
                    </label>
                    <select
                      disabled={cfg.mappingStrategy !== 'SetAssociative'}
                      value={cfg.associativity}
                      onChange={(e) =>
                        handleUpdateConfig(cfg.id, 'associativity', parseInt(e.target.value, 10))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none disabled:opacity-40"
                    >
                      <option value={2}>2-Way</option>
                      <option value={4}>4-Way</option>
                      <option value={8}>8-Way</option>
                    </select>
                  </div>

                  {/* Replacement Policy */}
                  <div className="col-span-2">
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Replacement Policy
                    </label>
                    <select
                      disabled={cfg.mappingStrategy === 'DirectMapped'}
                      value={cfg.replacementPolicy}
                      onChange={(e) =>
                        handleUpdateConfig(cfg.id, 'replacementPolicy', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-sky-500 outline-none disabled:opacity-40"
                    >
                      <option value="LRU">Least Recently Used (LRU)</option>
                      <option value="FIFO">First-In First-Out (FIFO)</option>
                    </select>
                  </div>
                </div>

                {/* Derived Geometry Badge */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>
                    Lines: <strong className="text-slate-300">{geom.totalLines}</strong>
                  </span>
                  <span>
                    Sets: <strong className="text-slate-300">{geom.numSets}</strong>
                  </span>
                  <span>
                    {cfg.mappingStrategy === 'DirectMapped'
                      ? '1-Way'
                      : cfg.mappingStrategy === 'SetAssociative'
                      ? `${cfg.associativity}-Way`
                      : 'Full'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 4. Results Section */}
      {comparisonResults && (
        <div className="space-y-6 pt-4 border-t border-slate-800 animate-fadeIn">
          {/* Workload-dependence educational callout banner */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-200/90 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-amber-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Workload-Dependence Notice</span>
            </div>
            <p className="leading-relaxed">
              {comparisonResults.analysis?.workloadDependenceNotice ||
                'Cache simulation performance is strictly workload-dependent. Configurations that excel under uniform sequential access may suffer under stride conflicts. Highlights below reflect performance exclusively on this generated trace.'}
            </p>
          </div>

          {/* Highlights Row (Highest Hit Rate & Lowest AMAT) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highest Hit Rate Card */}
            {(() => {
              const bestHitConfig = comparisonResults.comparisons.find(
                (c) => c.id === comparisonResults.analysis?.highestHitRateConfigId
              );
              return bestHitConfig ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Highest Hit Rate (This Workload)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {bestHitConfig.statistics.hitRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-100">{bestHitConfig.label}</div>
                  <p className="text-[11px] text-slate-400">
                    Recorded {bestHitConfig.statistics.hits.toLocaleString()} hits out of{' '}
                    {bestHitConfig.statistics.totalAccesses.toLocaleString()} accesses.
                  </p>
                </div>
              ) : null;
            })()}

            {/* Lowest Estimated AMAT Card */}
            {(() => {
              const bestAmatConfig = comparisonResults.comparisons.find(
                (c) => c.id === comparisonResults.analysis?.lowestAmatConfigId
              );
              return bestAmatConfig ? (
                <div className="p-4 bg-sky-950/30 border border-sky-500/40 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                      Lowest Estimated AMAT (This Workload)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {bestAmatConfig.statistics.amatNs.toFixed(2)} ns
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-100">{bestAmatConfig.label}</div>
                  <p className="text-[11px] text-slate-400">
                    Calculated using model assumptions (1.0 ns hit time + {bestAmatConfig.statistics.missRate.toFixed(1)}% × 50 ns penalty).
                  </p>
                </div>
              ) : null;
            })()}
          </div>

          {/* Comparison Table */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Configuration Comparison Table
              </h4>
              <span className="text-xs font-mono text-slate-400">
                Workload: {comparisonResults.workloadConfig.numberOfAccesses.toLocaleString()}{' '}
                accesses ({comparisonResults.workloadConfig.workloadType})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-semibold">Configuration</th>
                    <th className="pb-2 font-semibold">Capacity</th>
                    <th className="pb-2 font-semibold">Line Size</th>
                    <th className="pb-2 font-semibold">Mapping</th>
                    <th className="pb-2 font-semibold">Policy</th>
                    <th className="pb-2 font-semibold text-right">Hits</th>
                    <th className="pb-2 font-semibold text-right">Misses</th>
                    <th className="pb-2 font-semibold text-right">Hit Rate</th>
                    <th className="pb-2 font-semibold text-right">Miss Rate</th>
                    <th className="pb-2 font-semibold text-right">AMAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {comparisonResults.comparisons.map((c) => {
                    const isBestHit = c.id === comparisonResults.analysis?.highestHitRateConfigId;
                    const isBestAmat = c.id === comparisonResults.analysis?.lowestAmatConfigId;
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          isBestHit ? 'bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{c.label}</span>
                          {isBestHit && (
                            <span
                              title="Highest Hit Rate"
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            ></span>
                          )}
                        </td>
                        <td className="py-2.5 text-slate-300">
                          {c.cacheConfig.capacityBytes / 1024} KiB
                        </td>
                        <td className="py-2.5 text-slate-300">{c.cacheConfig.lineSizeBytes} B</td>
                        <td className="py-2.5 text-slate-300">
                          {c.cacheConfig.mappingStrategy === 'SetAssociative'
                            ? `${c.cacheConfig.associativity}-Way Set`
                            : c.cacheConfig.mappingStrategy}
                        </td>
                        <td className="py-2.5 text-slate-400">
                          {c.cacheConfig.mappingStrategy === 'DirectMapped'
                            ? 'N/A'
                            : c.cacheConfig.replacementPolicy}
                        </td>
                        <td className="py-2.5 text-right text-emerald-400 font-bold">
                          {c.statistics.hits.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right text-rose-400">
                          {c.statistics.misses.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              isBestHit
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'text-slate-200'
                            }`}
                          >
                            {c.statistics.hitRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-slate-400">
                          {c.statistics.missRate.toFixed(2)}%
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              isBestAmat
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'text-slate-300'
                            }`}
                          >
                            {c.statistics.amatNs.toFixed(2)} ns
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recharts Visualization */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Visual Comparison Chart
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparative performance across tested cache architectures
                </p>
              </div>

              {/* Chart Metric Selector */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('hitRate')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeChartTab === 'hitRate'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hit Rate (%)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('amat')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeChartTab === 'amat'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AMAT (ns)
                </button>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    fontFamily="monospace"
                    domain={activeChartTab === 'hitRate' ? [0, 100] : ['auto', 'auto']}
                    unit={activeChartTab === 'hitRate' ? '%' : ' ns'}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl font-mono text-xs space-y-1">
                            <div className="font-bold text-slate-100">{item.label}</div>
                            <div className="text-emerald-400">
                              Hit Rate: <span className="font-bold">{item.hitRate}%</span> ({item.hits} hits)
                            </div>
                            <div className="text-rose-400">
                              Miss Rate: <span className="font-bold">{item.missRate}%</span> ({item.misses} misses)
                            </div>
                            <div className="text-sky-400">
                              Estimated AMAT: <span className="font-bold">{item.amatNs} ns</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={activeChartTab === 'hitRate' ? 'hitRate' : 'amatNs'}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={60}
                  >
                    {chartData.map((entry) => {
                      let fillColor = '#0284c7';
                      if (activeChartTab === 'hitRate') {
                        fillColor = entry.isHighestHitRate ? '#10b981' : '#059669';
                      } else {
                        fillColor = entry.isLowestAmat ? '#38bdf8' : '#0284c7';
                      }
                      return <Cell key={entry.id} fill={fillColor} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sample Trace Verification Card */}
          {comparisonResults.sampleTraceAddresses &&
            comparisonResults.sampleTraceAddresses.length > 0 && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Verified Common Memory Trace
                  </span>
                  <span>
                    Initial {comparisonResults.sampleTraceAddresses.length} Addresses Sampled
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                  {comparisonResults.sampleTraceAddresses.map((addr, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400"
                    >
                      {addr}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
