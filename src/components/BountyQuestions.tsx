import React from 'react';
import { HelpCircle, Award, CheckCircle2, Star } from 'lucide-react';

export default function BountyQuestions() {
  return (
    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl" id="bounty-answers-container">
      <div className="flex items-center gap-3 mb-6 border-b border-[#222224] pb-5">
        <div className="p-2 rounded-xl bg-[#D4FF00]/10 text-[#D4FF00] shrink-0">
          <Award className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Yellowstone &amp; Jito Bounty Explanations</h3>
          <p className="text-xs text-[#888888] mt-0.5 font-sans">Scoring insights based on real-time network states and logs</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Question 1 */}
        <div className="bg-[#1e1e21] border border-[#222224] rounded-[20px] p-5" id="question-1-card">
          <div className="flex gap-3.5 items-start">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4FF00] text-black text-xs font-mono font-black shrink-0">1</span>
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                What does the delta between <code className="bg-[#121214] px-1.5 py-0.5 rounded text-[#D4FF00] font-mono text-[11px] border border-[#222224]">processed_at</code> and <code className="bg-[#121214] px-1.5 py-0.5 rounded text-[#D4FF00] font-mono text-[11px] border border-[#222224]">confirmed_at</code> tell you?
              </h4>
              <p className="text-[11px] text-[#c5c5c7] leading-relaxed font-sans">
                In our running stack, this delta yields the exact millisecond duration required for a supermajority (66.6%+) of the global Solana validator stake weight to observe, process, and broadcast consensus votes on the containing block after it is compiled. 
              </p>
              <div className="bg-[#121214] border border-[#222224] rounded-lg p-3 text-[10px] space-y-2 text-[#888888]">
                <span className="font-bold text-white block uppercase tracking-wider text-[9px]">System Interpretation:</span>
                <div>&bull; <span className="font-bold text-zinc-300">Widening Delta:</span> Signals that packet propagation latency is ascending, fork activity is high, or validators are delayed casting consensus votes due to heavy localized system loads.</div>
                <div>&bull; <span className="font-bold text-zinc-300">In practice:</span> During normal operations we register a minimal delta of <span className="font-semibold text-[#D4FF00]">~800ms - 1,200ms</span>. Under high simulated network congestion loads (&gt;75%), we observe this delta widening past <span className="font-semibold text-rose-400">3,500ms</span>.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question 2 */}
        <div className="bg-[#1e1e21] border border-[#222224] rounded-[20px] p-5" id="question-2-card">
          <div className="flex gap-3.5 items-start">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4FF00] text-black text-xs font-mono font-black shrink-0">2</span>
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                Why should you never use the <code className="bg-[#121214] px-1.5 py-0.5 rounded text-[#D4FF00] font-mono text-[11px] border border-[#222224]">&quot;finalized&quot;</code> commitment level when fetching a blockhash?
              </h4>
              <p className="text-[11px] text-[#c5c5c7] leading-relaxed font-sans">
                Solana transaction blockhashes possess an absolute validity window of precisely <span className="font-bold text-white font-mono">150 slots</span> (~60 seconds). A blockhash fetched with <code className="font-mono text-[11px] bg-[#121214] px-1.5 rounded border border-[#222224] text-white">finalized</code> commitment level is guaranteed to be already voted on by 31+ blocks of finalization depth.
              </p>
              <div className="bg-[#121214] border border-[#222224] rounded-lg p-3 text-[10px] text-[#888888] space-y-2 leading-relaxed">
                <div className="font-bold text-white mb-1 uppercase tracking-wider text-[9px]">Expiry Risk Mechanics:</div>
                <div>1. The blockhash is already <span className="font-bold text-zinc-300">~32 slots older</span> before your client even signs the transaction bytes, consuming over <span className="font-bold text-[#D4FF00]">21% of the validity window</span> up front.</div>
                <div>2. On a congested network where routing and bundle processing take an extra 10-20 slots, using a finalized blockhash multiplies your hazard for getting an immediate <span className="font-bold text-rose-400">EXPIRED_BLOCKHASH</span> fail.</div>
                <div>3. <span className="font-bold text-zinc-300">Mitigation:</span> Always call <code className="font-mono bg-[#121214] border border-[#222224] text-white px-1 rounded">getLatestBlockhash(&quot;confirmed&quot;)</code> on-chain so that transaction payloads are paired with pristine, low-latency identifiers.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question 3 */}
        <div className="bg-[#1e1e21] border border-[#222224] rounded-[20px] p-5" id="question-3-card">
          <div className="flex gap-3.5 items-start">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4FF00] text-black text-xs font-mono font-black shrink-0">3</span>
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                What happens if the Jito leader skips their designated slot?
              </h4>
              <p className="text-[11px] text-[#c5c5c7] leading-relaxed font-sans">
                A Jito bundle is strictly tied to a specific slot and execution window. If the scheduled Jito validator is offline or skips their designated slot block production task, the Jito block engine is unable to pack the bundle:
              </p>
              <div className="bg-[#121214] border border-[#222224] rounded-lg p-3 text-[10px] text-[#888888] space-y-2">
                <span className="font-bold text-white block uppercase tracking-wider text-[9px]">Failure Detection and AI Recovery:</span>
                <div>&bull; <span className="font-bold text-zinc-300">Real-Time Detect:</span> The Failure Classification engine notices that your bundle did not transition to processed, and checks the Yellowstone stream. When slot cursors tick by 5+ indexes past the leader slot without block production, it emits a <span className="font-semibold text-rose-400">LEADER_SKIP</span> event.</div>
                <div>&bull; <span className="font-bold text-zinc-300">AI Self-Healing Protocol:</span> The AI Agent reviews the state, detects that the prior blockhash is still young enough but the slot has elapsed, generates a fresh signature, tracks down the next approaching Jito leader window, and resubmits, bypassing any loss of funds.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
