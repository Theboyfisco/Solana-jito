import React, { useState } from 'react';
import { Play, Sparkles, Sliders, AlertCircle, RefreshCw } from 'lucide-react';

interface FaultControlsProps {
  onInjectFault: (scenario: 'BLOCKHASH_EXPIRY' | 'LOW_TIP' | 'LEADER_SKIP') => void;
  onSetCongestion: (score: number) => void;
  onSubmitBundle: (percentile: number, desc: string) => void;
  congestionScore: number;
  percentile: number;
  onPercentileChange: (percentile: number) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
}

export default function FaultControls({
  onInjectFault,
  onSetCongestion,
  onSubmitBundle,
  congestionScore,
  percentile,
  onPercentileChange,
  description,
  onDescriptionChange
}: FaultControlsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmitBundle(percentile, description);
    setIsSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Transaction Submission Card */}
      <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl flex flex-col justify-between hover:border-[#D4FF00]/40 transition-all duration-300 relative overflow-hidden" id="manual-dispatch-card">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#D4FF00] to-transparent opacity-50"></div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#D4FF00]" />
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Jito-Bundle Dispatcher</h3>
          </div>
          <p className="text-xs text-[#888888] mb-5 font-sans leading-relaxed">
            Construct, sign, and broadcast smart Jito bundles with dynamic tip injection relative to active Geyser percentiles.
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-[#888888] mb-1.5 uppercase tracking-wide">Transaction Description Payload</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="w-full text-xs bg-[#1e1e21] border border-[#222224] text-white rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#D4FF00] font-sans antialiased placeholder-zinc-600"
                placeholder="e.g., Token Swap Raydium Route"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#888888] mb-2 uppercase tracking-wide">Jito Tip Auction Strategy</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "p50 (Median)", value: 50 },
                  { label: "p75 (Active)", value: 75 },
                  { label: "p95 (Priority)", value: 95 },
                  { label: "p99 (Cap)", value: 99 }
                ].map((strat) => (
                  <button
                    key={strat.value}
                    type="button"
                    onClick={() => onPercentileChange(strat.value)}
                    className={`text-[10px] font-mono px-1.5 py-2.5 rounded-lg text-center transition-all border ${
                      percentile === strat.value
                        ? 'bg-[#D4FF00] border-[#D4FF00] text-black font-extrabold'
                        : 'bg-[#1e1e21] border-[#222224] text-[#888888] hover:bg-[#222224] hover:text-white'
                    }`}
                  >
                    {strat.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 bg-[#D4FF00] hover:bg-[#D4FF00]/90 text-black font-extrabold text-xs py-3 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50 tracking-wider uppercase"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 shrink-0" />
              )}
              Broadcast Smart Bundle
            </button>
          </form>
        </div>
      </div>

      {/* Network Fault Controls */}
      <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl flex flex-col justify-between hover:border-[#D4FF00]/40 transition-all duration-300 relative overflow-hidden" id="fault-injection-card">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#D4FF00] to-transparent opacity-50"></div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="h-4 w-4 text-[#D4FF00]" />
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Failure Injection &amp; Simulators</h3>
          </div>
          <p className="text-xs text-[#888888] mb-5 font-sans leading-relaxed">
            Manually trigger failures to evaluate real-time Failure Classification confidence scoring and AI Agent recovery operations.
          </p>

          <div className="space-y-4">
            {/* Congestion slider */}
            <div className="bg-[#1e1e21] border border-[#222224] rounded-xl p-4">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">Simulate Network Congestion</span>
                <span className="font-mono text-[#D4FF00] font-black">{(congestionScore * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="0.95" 
                step="0.05"
                value={congestionScore}
                onChange={(e) => onSetCongestion(parseFloat(e.target.value))}
                className="w-full h-1 mt-3.5 bg-[#222224] rounded-lg cursor-pointer accent-[#D4FF00]"
              />
              <p className="text-[10px] text-[#666666] mt-2 leading-normal">
                Increasing congestion raises median tip floors and extends block confirmation windows.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fault A Button */}
              <button
                type="button"
                onClick={() => onInjectFault('BLOCKHASH_EXPIRY')}
                className="flex items-start gap-2.5 bg-[#1e1e21] border border-[#222224] hover:bg-[#222224] hover:border-amber-500/40 p-3 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <AlertCircle className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Blockhash Expiry</h4>
                  <p className="text-[10px] text-[#888888] mt-0.5 leading-normal">
                    Builds older slot signatures. Triggers auto blockhash refreshes.
                  </p>
                </div>
              </button>

              {/* Fault B Button */}
              <button
                type="button"
                onClick={() => onInjectFault('LOW_TIP')}
                className="flex items-start gap-2.5 bg-[#1e1e21] border border-[#222224] hover:bg-[#222224] hover:border-rose-500/40 p-3 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                  <AlertCircle className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Underfloor Bid</h4>
                  <p className="text-[10px] text-[#888888] mt-0.5 leading-normal">
                    Submits tiny tip floor failing Jito validation auction rates.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
