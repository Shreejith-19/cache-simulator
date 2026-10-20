import React, { useState, useEffect, useCallback } from 'react';
import { getBackendHealth, getApiBaseUrl } from './services/api';

function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [theme, setTheme] = useState('dark');

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBackendHealth();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to reach C++ Crow backend');
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div data-theme={theme} className="min-h-screen bg-base-300 text-base-content flex flex-col font-sans transition-colors duration-200">
      {/* Navbar */}
      <header className="navbar bg-base-100 border-b border-base-200 shadow-md px-4 sm:px-8">
        <div className="flex-1 items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-lg font-mono font-black text-xl tracking-wider">
            [CPU::CACHE]
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">CPU Cache Simulator</h1>
            <p className="text-xs text-base-content/60 hidden sm:block">Computer Architecture & C++20 Full-Stack Portfolio</p>
          </div>
        </div>

        <div className="flex-none gap-3 items-center">
          {/* Status Indicator */}
          {loading ? (
            <div className="badge badge-warning gap-1.5 py-3 px-3">
              <span className="loading loading-spinner loading-xs"></span>
              <span className="text-xs font-semibold">Connecting...</span>
            </div>
          ) : error ? (
            <div className="badge badge-error gap-1.5 py-3 px-3">
              <span className="w-2 h-2 rounded-full bg-error-content animate-pulse"></span>
              <span className="text-xs font-semibold">Backend Offline</span>
            </div>
          ) : (
            <div className="badge badge-success gap-1.5 py-3 px-3">
              <span className="w-2 h-2 rounded-full bg-success-content animate-pulse"></span>
              <span className="text-xs font-semibold">Backend Online</span>
            </div>
          )}

          {/* Theme Selector */}
          <select 
            aria-label="Theme selector"
            className="select select-bordered select-xs"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="dim">Dim</option>
            <option value="synthwave">Synthwave</option>
            <option value="cyberpunk">Cyberpunk</option>
          </select>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-base-100 via-base-100 to-base-200 border border-base-content/10 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <span className="badge badge-primary badge-xs">v1.0 Skeleton</span> Project Initialized
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hardware-Accurate <span className="text-primary">Cache Simulator</span>
            </h2>
            <p className="text-base-content/80 text-sm sm:text-base leading-relaxed">
              Engineered with a high-performance <strong className="text-primary font-mono">C++20</strong> simulation engine exposed via a modern <strong className="text-secondary font-mono">Crow</strong> REST API, coupled with an interactive <strong className="text-accent font-mono">React + DaisyUI</strong> visualization workspace.
            </p>
          </div>
        </div>

        {/* Health Check & Communication Status Card */}
        <div className="card bg-base-100 border border-base-content/10 shadow-lg">
          <div className="card-body p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-4">
              <div>
                <h3 className="card-title text-lg flex items-center gap-2">
                  <span>Backend Health Check</span>
                  <span className="badge badge-neutral font-mono text-xs">GET /api/health</span>
                </h3>
                <p className="text-xs text-base-content/60">
                  Verifies full-duplex communication between React frontend and C++ Crow server.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {lastChecked && (
                  <span className="text-xs text-base-content/50">Checked at {lastChecked}</span>
                )}
                <button 
                  id="btn-refresh-health"
                  onClick={checkHealth} 
                  disabled={loading}
                  className="btn btn-sm btn-primary gap-2"
                >
                  {loading && <span className="loading loading-spinner loading-xs"></span>}
                  Test Health Endpoint
                </button>
              </div>
            </div>

            {/* Health Result Display */}
            <div className="mt-4">
              {loading && !healthData ? (
                <div className="p-8 text-center space-y-2 bg-base-200/50 rounded-xl">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                  <p className="text-xs text-base-content/60">Querying C++ Crow backend service...</p>
                </div>
              ) : error ? (
                <div className="alert alert-error shadow-sm rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <div>
                    <h4 className="font-bold text-sm">Connection Failed</h4>
                    <p className="text-xs">{error}</p>
                    <p className="text-xs mt-1 opacity-80">Make sure the C++ backend is running on port 8080 or check the development proxy configuration.</p>
                  </div>
                  <button onClick={checkHealth} className="btn btn-xs btn-outline">Retry</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="alert alert-success shadow-sm rounded-xl py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">Connected successfully to C++ Crow Backend!</span>
                      <span className="text-xs block opacity-90">{healthData?.message}</span>
                    </div>
                  </div>

                  {/* Diagnostic stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat bg-base-200/60 rounded-xl p-4">
                      <div className="stat-title text-xs font-medium">Service Status</div>
                      <div className="stat-value text-xl text-success font-mono uppercase">{healthData?.status || 'OK'}</div>
                      <div className="stat-desc text-xs mt-1">HTTP 200 OK Response</div>
                    </div>

                    <div className="stat bg-base-200/60 rounded-xl p-4">
                      <div className="stat-title text-xs font-medium">Backend Core</div>
                      <div className="stat-value text-xl text-primary font-mono">{healthData?.service || 'C++20'}</div>
                      <div className="stat-desc text-xs mt-1">Crow Microframework</div>
                    </div>

                    <div className="stat bg-base-200/60 rounded-xl p-4">
                      <div className="stat-title text-xs font-medium">API Version</div>
                      <div className="stat-value text-xl text-secondary font-mono">v{healthData?.version || '1.0.0'}</div>
                      <div className="stat-desc text-xs mt-1 font-mono text-[10px] truncate" title={getApiBaseUrl()}>
                        {getApiBaseUrl()}
                      </div>
                    </div>
                  </div>

                  {/* Raw JSON inspection */}
                  <div className="collapse collapse-arrow bg-base-200/40 rounded-xl border border-base-200">
                    <input type="checkbox" /> 
                    <div className="collapse-title text-xs font-mono font-medium flex items-center gap-2">
                      <span>Inspect Raw Server JSON Response</span>
                    </div>
                    <div className="collapse-content"> 
                      <pre className="p-3 bg-base-300 rounded-lg text-xs font-mono overflow-x-auto text-primary">
                        {JSON.stringify(healthData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Architecture & Tech Stack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frontend Module Card */}
          <div className="card bg-base-100 border border-base-content/10 shadow-md">
            <div className="card-body p-6 space-y-3">
              <h4 className="font-bold text-base flex items-center gap-2">
                <span className="badge badge-accent badge-sm font-mono">UI</span>
                Frontend Architecture
              </h4>
              <p className="text-xs text-base-content/70">
                Lightweight, reactive client layer decoupled from cache math.
              </p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <strong className="text-base-content">React 19 + JavaScript:</strong> Pure JS, zero unnecessary build overhead
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <strong className="text-base-content">Tailwind CSS + DaisyUI:</strong> Responsive component styling
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <strong className="text-base-content">Vite Dev Server:</strong> Instant HMR and built-in proxying to backend
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  <strong className="text-base-content">Recharts:</strong> Ready for cache hit/miss and latency visualizer
                </li>
              </ul>
            </div>
          </div>

          {/* Backend Module Card */}
          <div className="card bg-base-100 border border-base-content/10 shadow-md">
            <div className="card-body p-6 space-y-3">
              <h4 className="font-bold text-base flex items-center gap-2">
                <span className="badge badge-primary badge-sm font-mono">CORE</span>
                Backend Simulation Engine
              </h4>
              <p className="text-xs text-base-content/70">
                Native C++20 engine executing all memory address calculations and set lookups.
              </p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <strong className="text-base-content">C++20 Standard:</strong> Concepts, string_view, efficient data layouts
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <strong className="text-base-content">Crow HTTP Framework:</strong> Modern header-only asynchronous server
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <strong className="text-base-content">CMake 3.20+:</strong> Cross-platform build on Windows (MSVC) & Linux (WSL/GCC)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <strong className="text-base-content">Strict Separation:</strong> All cache hits/misses, evictions & policies run in C++
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Future Cache Configuration Teaser */}
        <div className="card bg-base-100 border border-base-content/10 shadow-md">
          <div className="card-body p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Upcoming Simulator Features</h4>
                <p className="text-xs text-base-content/60">Module specifications ready for algorithm implementation in next phase.</p>
              </div>
              <span className="badge badge-outline text-xs">Phase 2 Ready</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
              <div className="p-3 bg-base-200/50 rounded-lg border border-base-200">
                <div className="text-base-content/50 text-[10px]">ORGANIZATION</div>
                <div className="font-bold mt-1">Direct / N-Way / Full</div>
              </div>
              <div className="p-3 bg-base-200/50 rounded-lg border border-base-200">
                <div className="text-base-content/50 text-[10px]">REPLACEMENT</div>
                <div className="font-bold mt-1">LRU / LFU / FIFO / Random</div>
              </div>
              <div className="p-3 bg-base-200/50 rounded-lg border border-base-200">
                <div className="text-base-content/50 text-[10px]">WRITE POLICIES</div>
                <div className="font-bold mt-1">Write-Through & Back</div>
              </div>
              <div className="p-3 bg-base-200/50 rounded-lg border border-base-200">
                <div className="text-base-content/50 text-[10px]">TRACE INGESTION</div>
                <div className="font-bold mt-1">Valgrind & Custom Traces</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer footer-center p-4 bg-base-100 text-base-content/60 border-t border-base-200 text-xs">
        <aside>
          <p>CPU Cache Simulator — Full-Stack Portfolio Architecture (React + C++20 Crow)</p>
        </aside>
      </footer>
    </div>
  );
}

export default App;
