import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CacheConfigPanel from './components/CacheConfigPanel';
import WorkloadPanel from './components/WorkloadPanel';
import ResultsSection from './components/ResultsSection';
import { getBackendHealth, runSimulation } from './services/api';

export default function App() {
  // Backend Connection State
  const [backendStatus, setBackendStatus] = useState({
    state: 'loading', // 'loading' | 'online' | 'error'
    error: null,
  });

  // Controlled Cache Configuration State
  const [cacheConfig, setCacheConfig] = useState({
    capacityBytes: 4096,
    lineSizeBytes: 64,
    mappingStrategy: 'SetAssociative',
    associativity: 4,
    replacementPolicy: 'LRU',
  });

  // Controlled Workload Configuration State
  const [workload, setWorkload] = useState({
    workloadType: 'sequential',
    numberOfAccesses: 1000,
    randomSeed: 42,
  });

  // Simulation Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Check Backend Health
  const checkHealth = useCallback(async () => {
    setBackendStatus({ state: 'loading', error: null });
    try {
      await getBackendHealth();
      setBackendStatus({ state: 'online', error: null });
    } catch (err) {
      setBackendStatus({
        state: 'error',
        error: err.message || 'Cannot reach C++ backend server.',
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Handle configuration updates
  const handleCacheConfigChange = (field, value) => {
    setCacheConfig((prev) => {
      const next = { ...prev, [field]: value };
      // If switching to DirectMapped, set associativity to 1
      if (field === 'mappingStrategy' && value === 'DirectMapped') {
        next.associativity = 1;
      }
      return next;
    });
    setErrorMessage(null);
  };

  const handleWorkloadChange = (field, value) => {
    setWorkload((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  };

  // Run Simulation Handler
  const handleRunSimulation = async () => {
    setErrorMessage(null);

    // Frontend validation
    if (cacheConfig.capacityBytes < cacheConfig.lineSizeBytes) {
      setErrorMessage('Cache capacity cannot be smaller than line size.');
      return;
    }
    if (
      cacheConfig.mappingStrategy === 'SetAssociative' &&
      cacheConfig.capacityBytes < cacheConfig.lineSizeBytes * cacheConfig.associativity
    ) {
      setErrorMessage(
        `Capacity (${cacheConfig.capacityBytes} B) must be at least Line Size × Associativity (${
          cacheConfig.lineSizeBytes * cacheConfig.associativity
        } B).`
      );
      return;
    }
    if (workload.numberOfAccesses < 100 || workload.numberOfAccesses > 10000) {
      setErrorMessage('Number of accesses must be between 100 and 10,000.');
      return;
    }

    setIsRunning(true);
    try {
      const payload = {
        capacityBytes: cacheConfig.capacityBytes,
        lineSizeBytes: cacheConfig.lineSizeBytes,
        mappingStrategy: cacheConfig.mappingStrategy,
        associativity:
          cacheConfig.mappingStrategy === 'SetAssociative' ? cacheConfig.associativity : 1,
        replacementPolicy:
          cacheConfig.mappingStrategy === 'DirectMapped' ? 'LRU' : cacheConfig.replacementPolicy,
        workloadType: workload.workloadType,
        numberOfAccesses: workload.numberOfAccesses,
        randomSeed: workload.workloadType === 'random' ? workload.randomSeed : 42,
      };

      const data = await runSimulation(payload);
      setSimulationResults(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete simulation.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-sky-500/25 selection:text-sky-200">
      {/* 1. Header */}
      <Header backendStatus={backendStatus} onRetryHealth={checkHealth} />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Backend Warning Banner if offline */}
        {backendStatus.state === 'error' && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-start justify-between gap-3 text-xs">
            <div>
              <span className="font-bold">Backend Unreachable:</span> {backendStatus.error}
              <p className="opacity-80 mt-1 font-sans">
                Please ensure the C++ Crow server is running (<code className="font-mono bg-rose-950 px-1 py-0.5 rounded border border-rose-800">./build/Release/cache_simulator_backend.exe</code> on port 8080).
              </p>
            </div>
            <button
              onClick={checkHealth}
              className="btn btn-xs bg-rose-900/60 border-rose-700 text-rose-200 hover:bg-rose-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Configuration Row: Cache Config + Workload Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 2. Cache Configuration Panel */}
          <CacheConfigPanel
            config={cacheConfig}
            onChange={handleCacheConfigChange}
          />

          {/* 3. Workload Configuration Panel & Action Bar */}
          <div className="space-y-6">
            <WorkloadPanel
              workload={workload}
              onChange={handleWorkloadChange}
            />

            {/* 4. Action Area & Error Display */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-sm">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                id="btn-run-simulation"
                disabled={isRunning}
                onClick={handleRunSimulation}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isRunning
                    ? 'bg-sky-600/50 text-sky-200 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-[0.99]'
                }`}
              >
                {isRunning ? (
                  <>
                    <span className="loading loading-spinner loading-xs text-sky-200"></span>
                    <span>Simulating Cache in C++...</span>
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
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Run Simulation</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                <span>Core: Native C++20 engine</span>
                <span>Port: 8080 (REST / JSON)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Results Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Simulation Output & Trace Analytics
            </h2>
            {simulationResults && (
              <span className="text-xs font-mono text-slate-400">
                Trace: {simulationResults.statistics.totalAccesses.toLocaleString()} addresses
              </span>
            )}
          </div>

          <ResultsSection results={simulationResults} />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 px-4 sm:px-8 py-4 text-xs text-slate-400 font-mono text-center">
        <p>
          CPU Cache Simulator — Built with C++20 Crow Backend & React 19 + Tailwind CSS Frontend.
        </p>
      </footer>
    </div>
  );
}
