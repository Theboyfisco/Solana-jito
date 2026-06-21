import React, { useState } from 'react';
import { Brain, HelpCircle, Terminal, AlertCircle, Copy, CheckCircle, Cpu, ShieldCheck, Activity, ArrowRight, Zap } from 'lucide-react';
import { AgentDecision } from '../types';

interface AiDecisionsProps {
  decisions: AgentDecision[];
}

export default function AiDecisions({ decisions }: AiDecisionsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getActionClass = (action: string) => {
    switch (action) {
      case 'COMPOSITE':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'INCREASE_TIP':
        return 'bg-[#D4FF00]/15 text-[#D4FF00] border border-[#D4FF00]/30';
      case 'RETRY':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'WAIT':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'ABANDON':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
    }
  };

  return (
    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden" id="ai-decisions-container">
      {/* Decorative background grid mesh */}
      <div className="absolute inset-0 grid-mesh opacity-20 pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#222224] pb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#D4FF00]/10 p-2.5 rounded-xl border border-[#D4FF00]/30 animate-pulse">
            <Brain className="h-5 w-5 text-[#D4FF00]" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm uppercase tracking-widest font-mono">AI Recovery Decision Auditing</h3>
            <p className="text-[11px] text-[#888888] font-sans">Ingesting Yellowstone Geyser streams to classify faults and formulate self-healing transactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-300 font-bold uppercase tracking-wider">
            Engine: claude-3.5-sonnet
          </div>
          <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-[#D4FF00]/20 bg-[#D4FF00]/10 text-[#D4FF00] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00] animate-ping"></span>
            ACTIVE AUDITING
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Left Side: Dynamic Pipeline Node Schema */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#1e1e21] border border-[#222224] rounded-[20px] p-5 flex flex-col justify-between h-full relative overflow-hidden group">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-200 uppercase tracking-widest mb-4">
                <Terminal className="h-3.5 w-3.5 text-[#D4FF00]" /> Neural Node Pipeline
              </div>
              
              {/* Dynamic Interactive Node Diagram - HIGH UX CRAFT! */}
              <div className="space-y-4 my-5 bg-[#121214] p-4 rounded-xl border border-[#222224]/80">
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <div className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400">1</div>
                  <div className="flex-1">
                    <span className="text-[#888888] block text-[9px] uppercase">Input Ingestion</span>
                    <span className="text-white font-extrabold font-mono uppercase tracking-wide">Triggers Geyser Stream</span>
                  </div>
                  <Activity className="h-3.5 w-3.5 text-purple-400 animate-pulse shrink-0" />
                </div>

                <div className="h-4 border-l border-dashed border-[#222224] ml-3"></div>

                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <div className="h-6 w-6 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center font-bold text-[#D4FF00]">2</div>
                  <div className="flex-1">
                    <span className="text-[#888888] block text-[9px] uppercase">Confidence Audit</span>
                    <span className="text-white font-extrabold font-mono uppercase tracking-wide">Autonomous Self-Healing</span>
                  </div>
                  <ShieldCheck className="h-3.5 w-3.5 text-[#D4FF00] shrink-0" />
                </div>

                <div className="h-4 border-l border-dashed border-[#222224] ml-3"></div>

                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <div className="h-6 w-6 rounded-full bg-purple-500/10 border border-purple-500/25 flex items-center justify-center font-bold text-purple-400">3</div>
                  <div className="flex-1">
                    <span className="text-[#888888] block text-[9px] uppercase">Retry Lineage Loop</span>
                    <span className="text-white font-extrabold font-mono uppercase tracking-wide">Signed Jito Release</span>
                  </div>
                  <Zap className="h-3.5 w-3.5 text-amber-400 animate-bounce shrink-0" />
                </div>
              </div>

              <p className="text-[11px] text-[#888888] leading-relaxed mb-4 font-sans">
                Our Claude-guided block orchestrator actively monitors the payload signatures and builds a continuous state lineage graph.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#222224] text-[10px] text-[#666666] flex items-center gap-1.5 font-mono">
              <AlertCircle className="h-3.5 w-3.5 text-[#D4FF00] animate-pulse" />
              <span className="uppercase tracking-wider">Safety Protection Guardrail: Active</span>
            </div>
          </div>
        </div>

        {/* Right Side: Decision Feed and Transition Paths */}
        <div className="lg:col-span-2 space-y-5">
          {decisions.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#222224] rounded-[20px] bg-[#1e1e21]/20 flex flex-col items-center justify-center gap-3">
              <Brain className="h-8 w-8 text-[#666666] animate-bounce" />
              <p className="text-xs text-white uppercase font-extrabold font-mono tracking-widest">Awaiting Fault Detection Ticker</p>
              <p className="text-[11px] text-[#888888] font-sans max-w-sm">Submit a bundle with a low tip floor or expired blockhash on the dispatcher to ignite live agent reasoning loops.</p>
            </div>
          ) : (
            decisions.map((dec) => (
              <div 
                key={dec.id} 
                className="bg-[#1e1e21] border border-[#222224] rounded-[20px] p-5 shadow-2 border-l-2 border-l-[#D4FF00] hover:border-l-4 transition-all duration-300 relative overflow-hidden"
                id={`decision-card-${dec.id}`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3.5 border-b border-[#222224] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-500/10 text-purple-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-500/20">
                      ID: {dec.id}
                    </span>
                    <span className="text-[11px] font-mono text-[#888888]">
                      Target Bundle: <code className="bg-[#121214] px-1 py-0.5 rounded text-white font-mono text-[10px] border border-[#222224]">{dec.bundleId}</code>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#888888] font-bold">CONFIDENCE: {(dec.confidence * 100).toFixed(0)}%</span>
                    <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-1 rounded-md uppercase ${getActionClass(dec.action)}`}>
                      {dec.action}
                    </span>
                  </div>
                </div>

                {/* Live Self-Healing Process Flow Path - HIGH CREATIVITY FEATURE */}
                <div className="bg-[#121214]/50 border border-[#222224]/60 rounded-xl p-3 mb-4 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>INGESTED</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-zinc-700" />
                  <div className="flex items-center gap-1 text-[#D4FF00]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00] animate-ping"></span>
                    <span>AI GEYSER AUDIT</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-zinc-700" />
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                    <span>HEAL FORMULATED</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-zinc-700" />
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                    <span>LANDED</span>
                  </div>
                </div>

                {/* Verbatim Reasoning Bubble */}
                <div className="mb-4 bg-[#121214] border border-[#222224] rounded-xl p-4 text-xs font-sans text-zinc-300 relative group leading-relaxed">
                  <span className="text-xs font-mono font-bold text-[#D4FF00] block mb-1.5 uppercase tracking-widest">Model Live Chain-of-Thought Reasoning</span>
                  <p className="italic text-[#c5c5c7] pr-8 whitespace-pre-line font-medium leading-relaxed font-sans">
                    &quot;{dec.reasoning}&quot;
                  </p>
                  <button
                    onClick={() => handleCopy(dec.reasoning, dec.id)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1.5 rounded-lg border border-[#222224] hover:bg-[#1e1e21] bg-[#121214] transition-colors cursor-pointer"
                    title="Copy Reasoning Block"
                  >
                    {copiedId === dec.id ? <CheckCircle className="h-3.5 w-3.5 text-[#D4FF00]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Decision outcomes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#121214] rounded-xl p-3 border border-[#222224]">
                    <span className="text-[10px] font-mono font-bold text-[#888888] uppercase tracking-wider block mb-2">INJECTED DIRECTIVES</span>
                    <div className="space-y-1 font-mono text-[10px] text-zinc-300">
                      {dec.parameters.tipMultiplier && <div>Tip Multiplier: <span className="font-bold text-[#D4FF00]">{dec.parameters.tipMultiplier}x</span></div>}
                      {dec.parameters.targetPercentile && <div>Target Percentage: <span className="font-bold text-[#D4FF00]">p{dec.parameters.targetPercentile}</span></div>}
                      {dec.parameters.waitSlots && <div>Lock Wait delay: <span className="font-bold text-white">{dec.parameters.waitSlots} slots</span></div>}
                      {dec.parameters.sequence && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className="text-[#888888]">Sequence:</span>
                          {dec.parameters.sequence.map((seq, sIdx) => (
                            <span key={sIdx} className="bg-purple-950 border border-purple-500/30 rounded px-1 text-[9px] text-purple-400 font-bold uppercase">{seq}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#D4FF00]/5 rounded-xl p-3 border border-[#D4FF00]/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider block mb-1">ORCHESTRATOR LINEAGE STATUS</span>
                      <p className="text-[11px] font-mono font-bold text-white break-all leading-tight">
                        {dec.outcome || "Awaiting target submission trigger..."}
                      </p>
                    </div>
                    <span className="text-[9px] text-[#666666] mt-3 block font-mono">Captured: {new Date(dec.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
