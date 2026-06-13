import React, { useState } from 'react';
import { 
  History, Info, ChevronRight, ChevronDown, CheckCircle2, 
  XCircle, Clock, AlertTriangle, ExternalLink, HelpCircle 
} from 'lucide-react';
import { Bundle } from '../types';

interface BundleFeedProps {
  bundles: Bundle[];
}

export default function BundleFeed({ bundles }: BundleFeedProps) {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30 uppercase tracking-wider font-mono">
            <CheckCircle2 className="h-3 w-3" /> Finalized
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider font-mono">
            <Clock className="h-3 w-3 animate-pulse" /> Confirmed
          </span>
        );
      case 'PROCESSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider font-mono">
            <Clock className="h-3 w-3" /> Processed
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 animate-pulse uppercase tracking-wider font-mono">
            Submitted
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 uppercase tracking-wider font-mono">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      case 'ABANDONED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-600/10 text-zinc-400 border border-zinc-600/20 uppercase tracking-wider font-mono">
            <AlertTriangle className="h-3 w-3" /> Abandoned
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const filteredBundles = bundles.filter((b) => {
    if (filter === 'ACTIVE') return ['SUBMITTED', 'PROCESSED', 'CONFIRMED'].includes(b.status);
    if (filter === 'SUCCESS') return b.status === 'FINALIZED';
    if (filter === 'FAILURE') return ['FAILED', 'ABANDONED'].includes(b.status);
    return true;
  });

  const getCommitmentLatency = (b: Bundle) => {
    if (!b.processedAt || !b.submittedAt) return null;
    const sub = new Date(b.submittedAt).getTime();
    const proc = new Date(b.processedAt).getTime();
    const processedMs = proc - sub;

    if (!b.confirmedAt) return { processedMs };
    const conf = new Date(b.confirmedAt).getTime();
    const confirmedMs = conf - proc;

    return { processedMs, confirmedMs };
  };

  return (
    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl" id="bundle-feed-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#222224] pb-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#D4FF00]" />
          <div>
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Smart Jito-Bundle Ledger</h3>
            <p className="text-xs text-[#888888] mt-0.5 font-sans">Dual geyser signature monitoring &amp; block validation logs</p>
          </div>
        </div>

        {/* Filter badging row */}
        <div className="flex bg-[#1e1e21] border border-[#222224] rounded-lg p-0.5">
          {(['ALL', 'ACTIVE', 'SUCCESS', 'FAILURE'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`text-[10px] font-mono font-bold tracking-wider px-3 py-1.5 rounded-md cursor-pointer transition-all uppercase ${
                filter === opt
                  ? 'bg-[#D4FF00] text-black shadow-lg font-black'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#222224] text-[10px] font-mono font-bold text-[#666666] tracking-wider">
              <th className="pb-3 w-8"></th>
              <th className="pb-3">BUNDLE ID</th>
              <th className="pb-3 text-left">PAYLOAD / DESC</th>
              <th className="pb-3 text-center">TIP FEE</th>
              <th className="pb-3 text-center w-36">SUB-PRO-CON SLOTS</th>
              <th className="pb-3 text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222224]/50">
            {filteredBundles.map((b) => {
              const isExpanded = expandedId === b.id;
              const hasFailure = b.status === 'FAILED' || b.status === 'ABANDONED';
              const latency = getCommitmentLatency(b);

              return (
                <React.Fragment key={b.id}>
                  {/* Ledger Core Row */}
                  <tr 
                    onClick={() => toggleRow(b.id)}
                    className="hover:bg-[#1e1e21]/40 transition-colors cursor-pointer group text-xs text-[#c5c5c7] font-sans h-12"
                    id={`ledger-row-${b.id}`}
                  >
                    <td>
                      <button className="text-[#666666] group-hover:text-white p-1 cursor-pointer">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="font-mono text-white font-bold truncate max-w-28 pt-0.5">
                      {b.bundleId || b.id}
                    </td>
                    <td>
                      <div className="flex flex-col max-w-sm truncate">
                        <span className="font-semibold text-gray-200">{b.payloadDesc}</span>
                        {b.parentBundleId && (
                          <span className="text-[10px] text-[#D4FF00] font-mono flex items-center gap-0.5">
                            ↳ Retry of {b.parentBundleId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-center font-bold text-white">
                      {(b.tipLamports / 1000000000).toFixed(4)} SOL
                    </td>
                    <td className="font-mono text-[11px] text-center text-[#888888]">
                      <div className="flex justify-center items-center gap-1">
                        <span title="Submission Slot">{b.submissionSlot}</span>
                        <span className="text-[#666666]">&rarr;</span>
                        <span title="Processed Slot" className={b.processedSlot ? "text-[#D4FF00]" : "text-[#666666]"}>
                          {b.processedSlot ? b.processedSlot - b.submissionSlot : '?'}
                        </span>
                        <span className="text-[#666666]">&rarr;</span>
                        <span title="Confirmed Slot" className={b.confirmedSlot ? "text-cyan-400" : "text-[#666666]"}>
                          {b.confirmedSlot ? b.confirmedSlot - b.submissionSlot : '?'}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      {getStatusBadge(b.status)}
                    </td>
                  </tr>

                  {/* Expansion Detail panel */}
                  {isExpanded && (
                    <tr className="bg-[#1e1e21]/20" id={`ledger-row-expanded-${b.id}`}>
                      <td colSpan={6} className="px-6 py-5 bg-[#1e1e21]/10 font-sans border-y border-[#222224]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-300">
                          {/* Left Panel: Signature and Timings */}
                          <div className="space-y-2.5">
                            <h4 className="text-[10px] font-mono font-bold text-[#666666] tracking-wider uppercase mb-1">TRANSACTION METADATA</h4>
                            <div className="flex justify-between border-b border-[#222224] pb-2">
                              <span className="text-[#888888] font-medium">Solana Signature:</span>
                              <span className="font-mono font-bold text-white flex items-center gap-1 text-[11px]">
                                {b.signature ? `${b.signature.slice(0, 14)}...${b.signature.slice(-14)}` : 'N/A'}
                                {b.signature && (
                                  <a 
                                    href={`https://solscan.io/tx/${b.signature}?cluster=mainnet`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[#D4FF00] hover:text-[#D4FF00]/80 cursor-pointer p-0.5 shrink-0"
                                    title="View signature logs in Solscan (Simulated Context)"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-[#222224] pb-2">
                              <span className="text-[#888888] font-medium">Blockhash Used:</span>
                              <span className="font-mono text-zinc-300 text-[11px] truncate max-w-sm" title={b.blockhashUsed}>
                                {b.blockhashUsed}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-[#222224] pb-2">
                              <span className="text-[#888888] font-medium">Blockhash Slot Age:</span>
                              <span className="font-mono text-zinc-300">
                                Slot {b.blockhashSlot} ({b.submissionSlot - b.blockhashSlot} slots old on submit)
                              </span>
                            </div>
                            {latency && (
                              <div className="flex justify-between border-b border-[#222224] pb-2">
                                <span className="text-[#888888] font-medium">Sub ➔ Proc Confirmation:</span>
                                <span className="font-mono text-[#D4FF00] font-bold text-[11px]">
                                  {latency.processedMs ? `${latency.processedMs} ms` : 'Calculating...'}
                                  {latency.confirmedMs && ` (Proc ➔ Conf: ${latency.confirmedMs} ms)`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right Panel: Transaction Fault and Failure classifications */}
                          <div className="space-y-3 p-4 border border-[#222224] rounded-xl bg-[#1e1e21] shadow-2xl">
                            <h4 className="text-[10px] font-mono font-bold text-[#888888] tracking-wider uppercase flex items-center gap-1">
                              <Info className="h-3.5 w-3.5 text-[#D4FF00]" /> Smart Diagnostic Inspector
                            </h4>
                            {hasFailure ? (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-xs font-mono">
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                                  <div>
                                    <span className="font-bold uppercase">[{b.failureCategory}]</span>
                                    <p className="font-sans text-zinc-300 mt-0.5 text-[11px] leading-relaxed">
                                      {b.failureReason}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-[11px] text-[#888888] leading-normal font-sans">
                                  Our failure classification engine triggered an instant structured alert, feeding this diagnostic package directly into the server&apos;s intelligent AI agent recovery loop.
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 bg-[#D4FF00]/10 rounded-lg border border-[#D4FF00]/20 p-4 flex items-start gap-1.5 font-sans">
                                <CheckCircle2 className="h-4 w-4 text-[#D4FF00] shrink-0 mt-0.5" />
                                <div>
                                  <h5 className="font-bold text-[#D4FF00] text-[11px] uppercase tracking-wider">Sufficient Tips Floor</h5>
                                  <p className="text-[10px] text-zinc-300 mt-1 leading-normal">
                                    Bundle achieved success status! Verified on-chain via continuous Yellowstone Geyser subscription confirmations. No retry script actions required.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredBundles.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#666666] text-xs font-mono uppercase">
                  No bundles match the current status filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
