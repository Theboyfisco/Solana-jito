import React, { useState } from 'react';
import { Play, Sparkles, Sliders, AlertCircle, RefreshCw, Zap, Clock, SkipForward } from 'lucide-react';

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

const FAULT_SCENARIOS = [
  {
    id: 'BLOCKHASH_EXPIRY' as const,
    label: 'Blockhash Expiry',
    desc: 'Injects an expired blockhash — triggers the AI auto-refresh protocol.',
    icon: Clock,
    accent: 'hover:border-amber-500/50 hover:bg-amber-500/[0.04]',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    badge: 'border-amber-500/20 text-amber-400 bg-amber-500/10',
  },
  {
    id: 'LOW_TIP' as const,
    label: 'Underfloor Bid',
    desc: 'Submits a critically low tip — forces Jito auction rejection & AI tip escalation.',
    icon: Zap,
    accent: 'hover:border-rose-500/50 hover:bg-rose-500/[0.04]',
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    badge: 'border-rose-500/20 text-rose-400 bg-rose-500/10',
  },
  {
    id: 'LEADER_SKIP' as const,
    label: 'Leader Skip',
    desc: 'Simulates a Jito validator going offline — AI retargets to next leader window.',
    icon: SkipForward,
    accent: 'hover:border-blue-500/50 hover:bg-blue-500/[0.04]',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    badge: 'border-blue-500/20 text-blue-400 bg-blue-500/10',
  },
];

export default function FaultControls({
  onInjectFault,
  onSetCongestion,
  onSubmitBundle,
  congestionScore,
  percentile,
  onPercentileChange,
  description,
  onDescriptionChange,
}: FaultControlsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [injected, setInjected] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmitBundle(percentile, description);
    setIsSubmitting(false);
  };

  const handleInject = (id: typeof FAULT_SCENARIOS[number]['id']) => {
    onInjectFault(id);
    setInjected(id);
    setTimeout(() => setInjected(null), 3000);
  };

  const congestionLabel =
    congestionScore > 0.7 ? 'CRITICAL' : congestionScore > 0.4 ? 'ELEVATED' : 'NOMINAL';
  const congestionColor =
    congestionScore > 0.7 ? 'text-rose-400' : congestionScore > 0.4 ? 'text-amber-400' : 'text-[#D4FF00]';
  const trackColor =
    congestionScore > 0.7 ? 'accent-rose-400' : congestionScore > 0.4 ? 'accent-amber-400' : 'accent-[#D4FF00]';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6" id="fault-controls-root">

      {/* ── Left: Jito Bundle Dispatcher ── */}
      <div
        className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl hover:border-[#D4FF00]/30 transition-all duration-300 relative overflow-hidden"
        id="manual-dispatch-card"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#D4FF00]/60 to-transparent" />

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/20">
            <Sparkles className="h-4 w-4 text-[#D4FF00]" />
          </div>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
            Jito-Bundle Dispatcher
          </h3>
        </div>
        <p className="text-[11px] text-[#888888] mb-5 leading-relaxed font-sans">
          Construct, sign, and broadcast smart Jito bundles with dynamic tip injection relative to active Geyser percentiles.
        </p>

        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-bold text-[#666666] mb-1.5 uppercase tracking-wider">
              Transaction Payload Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full text-xs bg-[#1e1e21] border border-[#222224] text-white rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#D4FF00] font-sans placeholder-zinc-600 transition-colors"
              placeholder="e.g., Jupiter Aggregator Swap (Raydium Vault)"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-[#666666] mb-2 uppercase tracking-wider">
              Tip Auction Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'p50', sub: 'Median', value: 50 },
                { label: 'p75', sub: 'Active', value: 75 },
                { label: 'p95', sub: 'Priority', value: 95 },
                { label: 'p99', sub: 'Frontrunner', value: 99 },
              ].map((strat) => (
                <button
                  key={strat.value}
                  type="button"
                  onClick={() => onPercentileChange(strat.value)}
                  className={`py-2.5 px-3 rounded-xl text-left transition-all border flex items-center justify-between group cursor-pointer ${
                    percentile === strat.value
                      ? 'bg-[#D4FF00] border-[#D4FF00] text-black'
                      : 'bg-[#1e1e21] border-[#222224] text-zinc-400 hover:border-[#D4FF00]/30 hover:text-white'
                  }`}
                >
                  <span className={`font-mono font-black text-sm leading-none ${percentile === strat.value ? 'text-black' : ''}`}>
                    {strat.label}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    percentile === strat.value ? 'text-black/60' : 'text-zinc-600 group-hover:text-zinc-400'
                  }`}>
                    {strat.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#D4FF00] hover:bg-[#D4FF00]/90 active:scale-[0.98] text-black font-black text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-widest uppercase shadow-lg shadow-[#D4FF00]/10"
          >
            {isSubmitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 shrink-0 fill-black" />
            )}
            {isSubmitting ? 'Broadcasting…' : 'Broadcast Smart Bundle'}
          </button>
        </form>
      </div>

      {/* ── Right: Fault Injection ── */}
      <div
        className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl hover:border-[#D4FF00]/30 transition-all duration-300 relative overflow-hidden"
        id="fault-injection-card"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rose-500/50 to-transparent" />

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <Sliders className="h-4 w-4 text-rose-400" />
          </div>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
            Failure Injection &amp; Simulators
          </h3>
        </div>
        <p className="text-[11px] text-[#888888] mb-5 leading-relaxed font-sans">
          Trigger fault scenarios to evaluate real-time Failure Classification and autonomous AI Agent recovery.
        </p>

        <div className="space-y-3">
          {/* Congestion Slider */}
          <div className="bg-[#1e1e21] border border-[#222224] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono font-bold text-[#888888] uppercase tracking-wider">
                Network Congestion
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded border ${congestionColor} border-current bg-current/10`}>
                  {congestionLabel}
                </span>
                <span className={`font-mono font-black text-sm ${congestionColor}`}>
                  {(congestionScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={congestionScore}
              onChange={(e) => onSetCongestion(parseFloat(e.target.value))}
              className={`w-full h-1.5 rounded-full cursor-pointer bg-[#2a2a2d] ${trackColor}`}
            />
            <div className="flex justify-between mt-1.5 text-[9px] font-mono text-[#444446]">
              <span>5% LOW</span>
              <span>50% MED</span>
              <span>95% HIGH</span>
            </div>
          </div>

          {/* Fault scenario buttons — vertical stacked list */}
          <div className="space-y-2">
            {FAULT_SCENARIOS.map((scenario) => {
              const Icon = scenario.icon;
              const isActive = injected === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => handleInject(scenario.id)}
                  className={`w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isActive
                      ? 'border-[#D4FF00]/50 bg-[#D4FF00]/5'
                      : `bg-[#1a1a1d] border-[#222224] ${scenario.accent}`
                  }`}
                  id={`fault-btn-${scenario.id.toLowerCase()}`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-[#D4FF00]/15' : scenario.iconBg}`}>
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#D4FF00]' : scenario.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isActive ? 'text-[#D4FF00]' : 'text-white'}`}>
                        {scenario.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-mono font-black text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/20 px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                          INJECTED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#888888] mt-0.5 leading-relaxed font-sans truncate">
                      {scenario.desc}
                    </p>
                  </div>
                  <span className={`text-[9px] font-mono font-black shrink-0 uppercase tracking-wider px-2 py-1 rounded border ${scenario.badge}`}>
                    INJECT
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
