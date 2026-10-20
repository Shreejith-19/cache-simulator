import React, { useState, useMemo } from 'react';

export default function TraceHistoryTable({ accessHistory = [] }) {
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('all'); // 'all', 'hits', 'misses', 'evictions'
  const [searchQuery, setSearchQuery] = useState('');
  const [showRawModal, setShowRawModal] = useState(false);

  // Filtered dataset
  const filteredHistory = useMemo(() => {
    let result = accessHistory;

    // Filter by result status
    if (filterType === 'hits') {
      result = result.filter((item) => item.hit);
    } else if (filterType === 'misses') {
      result = result.filter((item) => !item.hit);
    } else if (filterType === 'evictions') {
      result = result.filter((item) => item.eviction);
    }

    // Filter by search query (hex address, decimal address, set index, tag)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const hex = (item.hexAddress || '').toLowerCase();
        const addr = String(item.address);
        const setIdx = String(item.setIndex);
        const tag = String(item.tag);
        const access = String(item.accessIndex);
        return (
          hex.includes(q) ||
          addr.includes(q) ||
          setIdx.includes(q) ||
          tag.includes(q) ||
          access.includes(q)
        );
      });
    }

    return result;
  }, [accessHistory, filterType, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const page = Math.min(Math.max(1, currentPage), totalPages);

  const displayedHistory = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, page, pageSize]);

  // Export full trace as JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(accessHistory, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cache_trace_${accessHistory.length}_records.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export full trace as CSV
  const handleExportCsv = () => {
    const headers = [
      'AccessIndex',
      'AddressHex',
      'AddressDecimal',
      'SetIndex',
      'LineIndex',
      'Tag',
      'Result',
      'Eviction',
      'EvictedTag',
    ];
    const rows = accessHistory.map((item) => [
      item.accessIndex,
      item.hexAddress,
      item.address,
      item.setIndex,
      item.lineIndex,
      item.tag,
      item.hit ? 'HIT' : 'MISS',
      item.eviction ? 'YES' : 'NO',
      item.eviction ? item.evictedTag : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `cache_trace_${accessHistory.length}_records.csv`;
    link.click();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-0">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Per-Access History Trace</span>
            <span className="badge badge-sm font-mono bg-slate-800 text-sky-400 border border-slate-700">
              {filteredHistory.length.toLocaleString()} of {accessHistory.length.toLocaleString()} records
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Bounded tabular display with pagination to handle up to 10,000 trace entries smoothly.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Search box */}
          <input
            type="text"
            placeholder="Search addr / tag / set..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="input input-xs bg-slate-950 border-slate-700 text-slate-200 text-xs font-mono w-40 sm:w-48 focus:border-sky-500 focus:outline-none"
          />

          {/* Export & Inspect Buttons */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-xs bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 font-mono"
            title="Download full trace as CSV"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="btn btn-xs bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 font-mono"
            title="Download full trace as JSON"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => setShowRawModal(true)}
            className="btn btn-xs bg-sky-950/70 border-sky-800/80 text-sky-300 hover:bg-sky-900 font-mono"
            title="Inspect full raw JSON without freezing DOM"
          >
            Inspect Raw
          </button>
        </div>
      </div>

      {/* Filter and Page Size Controls */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] mr-1">Filter:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'hits', label: 'Hits' },
            { id: 'misses', label: 'Misses' },
            { id: 'evictions', label: 'Evictions' },
          ].map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => {
                setFilterType(f.id);
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                filterType === f.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Page size dropdown */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="select select-bordered select-xs bg-slate-900 border-slate-700 text-slate-300 font-mono focus:border-sky-500"
          >
            {[25, 50, 100, 250].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto">
        <table className="table table-xs w-full text-slate-300 font-mono">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
                <td colSpan="7" className="text-center py-8 text-slate-400 text-xs font-sans">
                  No access records match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">
            Showing {(page - 1) * pageSize + 1} -{' '}
            {Math.min(page * pageSize, filteredHistory.length)} of{' '}
            {filteredHistory.length.toLocaleString()} matching records
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={page === 1}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
              title="First Page"
            >
              &laquo; First
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
            >
              &lsaquo; Prev
            </button>
            <span className="px-3 py-1 text-slate-200 font-semibold text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
            >
              Next &rsaquo;
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
              title="Last Page"
            >
              Last &raquo;
            </button>
          </div>
        </div>
      )}

      {/* Raw Trace Inspection Modal */}
      {showRawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-mono">
                  Raw Trace Inspection ({accessHistory.length.toLocaleString()} Accesses)
                </h4>
                <p className="text-xs text-slate-400">
                  Preview of full simulation trace output from C++ Crow backend.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRawModal(false)}
                className="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 font-mono text-xs bg-slate-950 text-slate-300">
              <pre>{JSON.stringify(accessHistory.slice(0, 500), null, 2)}</pre>
              {accessHistory.length > 500 && (
                <div className="p-3 mt-2 bg-slate-900 rounded border border-slate-800 text-amber-300 text-xs">
                  Showing first 500 records of {accessHistory.length.toLocaleString()} in preview.
                  Use &apos;Export JSON&apos; or &apos;Export CSV&apos; to download the full dataset.
                </div>
              )}
            </div>
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="btn btn-xs btn-primary font-mono"
              >
                Download Full JSON
              </button>
              <button
                type="button"
                onClick={() => setShowRawModal(false)}
                className="btn btn-xs btn-outline font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
