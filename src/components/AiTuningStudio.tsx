import React, { useState } from 'react';
import { Sliders, Brain, Terminal, Shield, Sparkles, Check, Play, RefreshCw, AlertCircle } from 'lucide-react';

interface AiTuningStudioProps {
  onRegisterSystemRule?: (ruleText: string, temp: number, bias: string) => void;
  isRegistered?: boolean;
}

export default function AiTuningStudio({ onRegisterSystemRule, isRegistered }: AiTuningStudioProps) {
  const [temperature, setTemperature] = useState<number>(0.7);
  const [strategyBias, setStrategyBias] = useState<'BALANCED' | 'MAX_LANDING' | 'GAS_OPTIMIZED'>('BALANCED');
  const [customRule, setCustomRule] = useState<string>(
    "Under network congestion > 65%, immediately bypass standard median (p50) paths. Overwrite retry targets targeting the block frontrunner (p99) percentile to secure immediate block engine consensus."
  );
  const [tuningComplete, setTuningComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleApplyRules = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setTuningComplete(true);
      if (onRegisterSystemRule) {
        onRegisterSystemRule(customRule, temperature, strategyBias);
      }
      setTimeout(() => setTuningComplete(false), 5000);
    }, 1200);
  };

  return (
    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden" id="ai-tuning-studio">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/2 rounded-full blur-2xl"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#222224] pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 p-2 text-purple-400 rounded-xl border border-purple-500/20">
            <Sliders className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm uppercase tracking-widest font-mono">Neural Model Configuration Console</h3>
            <p className="text-[11px] text-[#888888] font-sans">Tune Claude model system prompts, temperature thresholds, &amp; cost limits on-the-fly</p>
          </div>
        </div>

        <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-purple-500/25 bg-purple-500/10 text-purple-300 font-bold uppercase tracking-wider">
          LIVE DIRECTIVES ACCESS
        </div>
      </div>

      <form onSubmit={handleApplyRules} className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs text-zinc-300">
        {/* Left column - Sliders and config variables */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1e1e21] border border-[#222224] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-1 font-mono font-bold text-[#888888] uppercase tracking-wide">
              <span>Model Temperature</span>
              <span className="text-[#D4FF00] font-black">{temperature.toFixed(1)}</span>
            </div>
            <input 
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 mt-3 bg-[#222224] rounded-lg cursor-pointer accent-[#D4FF00]"
            />
            <p className="text-[9px] text-[#666666] mt-2 font-sans">
              Lower temperatures enforce strict compliance patterns; higher scores encourage speculative routing strategies.
            </p>
          </div>

          <div className="bg-[#1e1e21] border border-[#222224] rounded-2xl p-4">
            <span className="block font-mono font-bold text-[#888888] uppercase tracking-wide mb-3">Self-Healing Priority Bias</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'BALANCED', label: 'Balanced' },
                { id: 'MAX_LANDING', label: 'Priority Landing' },
                { id: 'GAS_OPTIMIZED', label: 'Gas Saver' }
              ].map((biasOpt) => (
                <button
                  key={biasOpt.id}
                  type="button"
                  onClick={() => setStrategyBias(biasOpt.id as any)}
                  className={`px-2 py-2 text-[10px] rounded-lg border font-mono transition-all uppercase cursor-pointer ${
                    strategyBias === biasOpt.id
                      ? 'bg-[#D4FF00] text-black border-[#D4FF00] font-black'
                      : 'bg-[#121214] text-[#888888] border-[#222224] hover:bg-[#222224] hover:text-white'
                  }`}
                >
                  {biasOpt.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[#666666] mt-2 font-sans">
              Overrides target priority. <code className="text-zinc-400">Priority Landing</code> instructs the model to bypass cost limits under active contention blocks.
            </p>
          </div>
        </div>

        {/* Right column - Prompt injection window */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="bg-[#1e1e21] border border-[#222224] rounded-2xl p-4 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2 font-mono font-bold text-[#888888] uppercase tracking-wide">
              <span>Structured Prompt Injection Directives</span>
              <span className="text-[9px] text-[#666666] lowercase">verbatim overwrite</span>
            </div>
            
            <textarea
              value={customRule}
              onChange={(e) => setCustomRule(e.target.value)}
              className="w-full flex-1 bg-[#121214] border border-[#222224] text-zinc-300 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#D4FF00] font-sans antialiased placeholder-zinc-700 min-h-24 resize-none leading-relaxed"
              placeholder="e.g. Under EXPIRY errors raise tips to standard p99"
              required
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 max-w-[65%] text-[10px] font-sans text-[#888888]">
              <Shield className="h-4 w-4 text-purple-400 shrink-0" />
              <span>Directives undergo sandboxed schema checks before injection.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-98 shadow-lg cursor-pointer disabled:opacity-50 uppercase tracking-widest"
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : tuningComplete ? (
                <Check className="h-3.5 w-3.5 text-white" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {tuningComplete ? "Directives Active!" : "Inject Directives"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
