import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

// Custom tooltip
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-950 border border-slate-700/80 p-3 rounded-lg shadow-xl font-mono text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold" style={{ color: item.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
          <span>{item.name}</span>
        </div>
        <div className="text-slate-200">
          Count: <span className="font-bold">{item.value.toLocaleString()}</span>
        </div>
        <div className="text-slate-400">
          Percentage: <span className="font-bold">{item.rate.toFixed(2)}%</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function HitMissDistribution({ statistics }) {
  if (!statistics) return null;

  const hits = Number(statistics.hits) || 0;
  const misses = Number(statistics.misses) || 0;
  const total = Number(statistics.totalAccesses) || 0;
  const hitRate = Number(statistics.hitRate) || 0;
  const missRate = Number(statistics.missRate) || 0;

  const data = [
    { name: 'Cache Hits', value: hits, rate: hitRate, color: '#10b981' },
    { name: 'Cache Misses', value: misses, rate: missRate, color: '#f43f5e' },
  ];

  // Custom Legend Renderer
  const renderLegend = () => (
    <div className="flex justify-center items-center gap-6 text-xs font-mono pt-2">
      <div className="flex items-center gap-2 text-emerald-400">
        <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
        <span>
          Hits: <strong>{hitRate.toFixed(2)}%</strong> ({hits.toLocaleString()})
        </span>
      </div>
      <div className="flex items-center gap-2 text-rose-400">
        <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
        <span>
          Misses: <strong>{missRate.toFixed(2)}%</strong> ({misses.toLocaleString()})
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Hit / Miss Distribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Breakdown of memory requests satisfied in-cache vs main memory penalties.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 hidden sm:block">
          Total: {total.toLocaleString()} accesses
        </div>
      </div>

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-mono">
          No memory accesses to display.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible horizontal progress bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div
                style={{ width: `${hitRate}%` }}
                className="bg-emerald-500 transition-all duration-500"
                aria-label={`Hits: ${hitRate.toFixed(1)}%`}
              ></div>
              <div
                style={{ width: `${missRate}%` }}
                className="bg-rose-500 transition-all duration-500"
                aria-label={`Misses: ${missRate.toFixed(1)}%`}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
