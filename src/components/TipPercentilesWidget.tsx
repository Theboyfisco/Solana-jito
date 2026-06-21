import React from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Layers, Check, TrendingUp } from 'lucide-react';
import { TipSnapshot } from '../types';

// Known Jito tip accounts on Solana mainnet (static list — same 8 accounts as stream.ts)
const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYLFGGAzBqcNkiNpqB8bBTmMxBDKwhCTZFMG",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1sMXoi62cCo",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL3",
  "3AVoygJbyZ76DGJdQ6asgFuigQmgTG7Y87ngo7ZRWVKm",
  "6m9F9H68p9ZLa9sDoAnW48mE9X877wKNo6B6v9NoBD1c",
  "DfXSA2dwvSt8mGcqi77709gQBjXm991E4CNoQnoBD3b"
];

interface TipPercentilesWidgetProps {
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
  };
  congestionScore: number;
  selectedPercentile?: number;
  onSelectPercentile?: (percentile: number) => void;
  snapshots?: TipSnapshot[];
}

/** Renders a mini SVG sparkline for an array of values */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const W = 100; const H = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Glow dot on last value */}
      {values.length > 0 && (
        <circle
          cx={(values.length - 1) / (values.length - 1) * W}
          cy={H - ((values[values.length - 1] - min) / range) * H}
          r="2"
          fill={color}
          opacity="1"
        />
      )}
    </svg>
  );
}

export default function TipPercentilesWidget({ 
  percentiles, 
  congestionScore,
  selectedPercentile,
  onSelectPercentile,
  snapshots = []
}: TipPercentilesWidgetProps) {
  const formatSol = (lamports: number) => {
    return (lamports / 1000000000).toFixed(4) + " SOL";
  };

  const isRising = congestionScore > 0.6;
  const p75Values = (snapshots || []).slice(-15).map(s => s.p75);

  return (
    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl flex flex-col justify-between h-auto hover:border-[#D4FF00]/40 transition-all duration-300" id="tips-percentiles-widget">
      <div>
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#D4FF00]" />
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Tip Floor Matrix</h3>
          </div>
          <div className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 uppercase tracking-wide border ${
            isRising ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-[#D4FF00]/10 text-[#D4FF00] border-[#D4FF00]/20'
          }`}>
            {isRising ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            Trend: {isRising ? 'Rising' : 'Stable'}
          </div>
        </div>

        <p className="text-xs text-[#888888] leading-relaxed mb-4 font-sans">
          Real-time rolling Geyser transaction validator fees.
          <span className="block mt-1 text-[#D4FF00] font-mono font-bold text-[10px] uppercase">💡 Click any tier to load into the dispatcher</span>
        </p>

        {p75Values.length >= 2 && (
          <div className="mb-4 bg-[#161618] border border-[#222224] rounded-xl p-3">
            <div className="flex justify-between items-center mb-1.5 font-mono text-[9px] text-[#888888] uppercase font-bold tracking-wider">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-[#D4FF00]" />
                Live Tip Trend (p75)
              </span>
              <span className="text-white font-extrabold font-mono">{formatSol(p75Values[p75Values.length - 1])}</span>
            </div>
            <div className="h-6 flex items-end">
              <Sparkline values={p75Values} color="#D4FF00" />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {[
            { label: 'Low Competitiveness (p25)', lamports: percentiles.p25, color: 'bg-zinc-650', percentage: 25 },
            { label: 'Standard Median (p50)', lamports: percentiles.p50, color: 'bg-zinc-500', percentage: 50 },
            { label: 'Active Competitive (p75)', lamports: percentiles.p75, color: 'bg-[#D4FF00]/60', percentage: 75 },
            { label: 'High Priority (p95)', lamports: percentiles.p95, color: 'bg-[#D4FF00]', percentage: 95 },
            { label: 'Block Frontrunner (p99)', lamports: percentiles.p99, color: 'bg-gradient-to-r from-[#D4FF00] to-amber-400', percentage: 99 },
          ].map((item, idx) => {
            const p99Max = percentiles.p99 || 1;
            const barPct = Math.min(100, Math.max(5, (item.lamports / p99Max) * 100));
            const isClickable = [50, 75, 95, 99].includes(item.percentage);
            const isSelected = selectedPercentile === item.percentage;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => isClickable && onSelectPercentile?.(item.percentage)}
                disabled={!isClickable}
                className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 border text-xs block relative group ${
                  isClickable 
                    ? isSelected
                      ? 'bg-[#1e1e21] border-[#D4FF00] shadow-md'
                      : 'bg-[#161618] border-transparent hover:border-[#222224] hover:bg-[#1e1e21]/60 cursor-pointer'
                    : 'bg-[#121214] border-transparent opacity-60 cursor-not-allowed'
                }`}
                id={`percentile-row-${item.percentage}`}
              >
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono font-bold text-[10px] uppercase tracking-wide ${
                      isSelected ? 'text-[#D4FF00]' : 'text-zinc-300'
                    }`}>
                      {item.label}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[#D4FF00]" />}
                  </div>
                  <span className={`font-mono font-bold leading-none ${
                    isSelected ? 'text-[#D4FF00]' : 'text-white'
                  }`}>
                    {formatSol(item.lamports)}
                  </span>
                </div>
                <div className="w-full bg-[#0b0b0c] h-1.5 rounded-full overflow-hidden border border-[#222224]/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${barPct}%` }}
                  ></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-[#222224]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#666666] uppercase">JITO TIP ACCOUNTS DISTRIBUTION</span>
          <span className="text-[10px] font-mono text-[#D4FF00] bg-[#D4FF00]/10 px-2.5 py-0.5 rounded border border-[#D4FF00]/20 font-bold uppercase">ROTATED</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {JITO_TIP_ACCOUNTS.slice(0, 4).map((acc, key) => (
            <div key={key} className="bg-[#1e1e21] rounded p-2 text-center border border-[#222224] text-[10px] font-mono text-[#888888] truncate hover:border-[#D4FF00]/40 transition-colors">
              {acc.slice(0, 6)}...{acc.slice(-6)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
