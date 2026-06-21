import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal, Circle, Zap, Brain, Layers, ChevronDown } from 'lucide-react';
import { Bundle, AgentDecision } from '../types';

interface LogEntry {
  id: string;
  ts: string;
  type: 'SLOT' | 'TIP' | 'BUNDLE' | 'AI' | 'RETRY' | 'LIFECYCLE' | 'FAULT' | 'SYSTEM';
  message: string;
  detail?: string;
  slot?: number;
}

interface LiveEventLogProps {
  currentSlot: number;
  bundles: Bundle[];
  decisions: AgentDecision[];
  percentiles: { p25: number; p50: number; p75: number; p95: number; p99: number };
  congestionScore: number;
}

const TYPE_CONFIG: Record<LogEntry['type'], { color: string; badge: string; icon: React.ReactNode }> = {
  SLOT:      { color: 'text-zinc-400',   badge: 'bg-zinc-700 text-zinc-300',          icon: <Circle className="h-2.5 w-2.5 text-zinc-400 animate-pulse" /> },
  TIP:       { color: 'text-[#D4FF00]',  badge: 'bg-[#D4FF00]/15 text-[#D4FF00]',    icon: <Layers className="h-2.5 w-2.5 text-[#D4FF00]" /> },
  BUNDLE:    { color: 'text-cyan-300',   badge: 'bg-cyan-500/15 text-cyan-300',       icon: <Zap className="h-2.5 w-2.5 text-cyan-300" /> },
  AI:        { color: 'text-purple-300', badge: 'bg-purple-500/15 text-purple-300',   icon: <Brain className="h-2.5 w-2.5 text-purple-300 animate-pulse" /> },
  RETRY:     { color: 'text-amber-300',  badge: 'bg-amber-500/15 text-amber-300',     icon: <Zap className="h-2.5 w-2.5 text-amber-300" /> },
  LIFECYCLE: { color: 'text-emerald-300',badge: 'bg-emerald-500/15 text-emerald-300', icon: <Circle className="h-2.5 w-2.5 text-emerald-300" /> },
  FAULT:     { color: 'text-rose-300',   badge: 'bg-rose-500/15 text-rose-300',       icon: <Circle className="h-2.5 w-2.5 text-rose-400" /> },
  SYSTEM:    { color: 'text-[#D4FF00]',  badge: 'bg-[#D4FF00]/10 text-[#D4FF00]',    icon: <Circle className="h-2.5 w-2.5 text-[#D4FF00]" /> },
};

function formatLamports(l: number): string {
  if (l >= 1_000_000) return (l / 1_000_000).toFixed(2) + 'M';
  if (l >= 1_000) return (l / 1_000).toFixed(1) + 'K';
  return l.toString();
}

function now(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}

function makeId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const MAX_ENTRIES = 120;

export default function LiveEventLog({ currentSlot, bundles, decisions, percentiles, congestionScore }: LiveEventLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<LogEntry['type'] | 'ALL'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track what we've already logged to avoid duplicates
  const lastSlotRef = useRef(0);
  const lastBundleCountRef = useRef(0);
  const lastDecisionCountRef = useRef(0);
  const seenBundleStatuses = useRef<Record<string, string>>({});
  const tickRef = useRef(0);

  const push = useCallback((entry: Omit<LogEntry, 'id' | 'ts'>) => {
    if (paused) return;
    setEntries(prev => {
      const next = [...prev, { ...entry, id: makeId(), ts: now() }];
      return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
    });
  }, [paused]);

  // Slot heartbeat — emit every 10 slots to keep the log readable
  useEffect(() => {
    if (currentSlot === 0 || currentSlot === lastSlotRef.current) return;
    lastSlotRef.current = currentSlot;
    tickRef.current += 1;

    if (tickRef.current % 10 === 1) {
      push({
        type: 'SLOT',
        message: `Slot ${currentSlot.toLocaleString()} — Yellowstone heartbeat ✓`,
        detail: `Congestion: ${(congestionScore * 100).toFixed(0)}% · Slot duration: 400ms`,
        slot: currentSlot
      });
    }

    // Emit tip intel every 30 slots
    if (tickRef.current % 30 === 1) {
      push({
        type: 'TIP',
        message: `Tip Intel update — p50: ${formatLamports(percentiles.p50)} · p75: ${formatLamports(percentiles.p75)} · p95: ${formatLamports(percentiles.p95)} lamports`,
        detail: `p99 frontier: ${formatLamports(percentiles.p99)} lamports | Trend: ${congestionScore > 0.6 ? '📈 Rising' : '📊 Stable'}`,
        slot: currentSlot
      });
    }
  }, [currentSlot, push, percentiles, congestionScore]);

  // Bundle lifecycle transitions
  useEffect(() => {
    for (const b of bundles) {
      const prevStatus = seenBundleStatuses.current[b.id];
      const cur = b.status;
      if (prevStatus === cur) continue;
      seenBundleStatuses.current[b.id] = cur;

      if (!prevStatus) {
        // New bundle — just submitted
        push({
          type: 'BUNDLE',
          message: `Bundle ${b.bundleId?.slice(0, 18) ?? b.id} SUBMITTED`,
          detail: `Tip: ${formatLamports(b.tipLamports)} lamports · ${b.payloadDesc ?? ''}`,
          slot: b.submissionSlot
        });
      } else if (cur === 'PROCESSED') {
        push({
          type: 'LIFECYCLE',
          message: `Bundle ${b.bundleId?.slice(0, 18) ?? b.id} → PROCESSED ✓`,
          detail: b.processedAt ? `Landed in ~${new Date(b.processedAt).getTime() - new Date(b.submittedAt).getTime()}ms` : '',
          slot: b.processedSlot
        });
      } else if (cur === 'CONFIRMED') {
        push({
          type: 'LIFECYCLE',
          message: `Bundle ${b.bundleId?.slice(0, 18) ?? b.id} → CONFIRMED ✓✓`,
          detail: b.confirmedAt && b.processedAt
            ? `processed→confirmed delta: ${new Date(b.confirmedAt).getTime() - new Date(b.processedAt).getTime()}ms`
            : '',
          slot: b.confirmedSlot
        });
      } else if (cur === 'FINALIZED') {
        push({
          type: 'LIFECYCLE',
          message: `Bundle ${b.bundleId?.slice(0, 18) ?? b.id} → FINALIZED ✓✓✓ 🏆`,
          detail: `${b.retryCount > 0 ? `Retry #${b.retryCount} succeeded` : 'First-attempt success'}`,
          slot: b.finalizedSlot
        });
      } else if (cur === 'FAILED') {
        push({
          type: 'FAULT',
          message: `Bundle ${b.bundleId?.slice(0, 18) ?? b.id} FAILED [${b.failureCategory ?? 'UNKNOWN'}]`,
          detail: b.failureReason ?? 'Classification pending...',
          slot: currentSlot
        });
      } else if (cur === 'ABANDONED') {
        push({
          type: 'FAULT',
          message: `Bundle ${b.bundleId?.slice(0, 18) ?? b.id} ABANDONED — retry limit reached`,
          detail: b.failureReason ?? '',
          slot: currentSlot
        });
      }
    }
  }, [bundles, push, currentSlot]);

  // AI decisions
  useEffect(() => {
    if (decisions.length <= lastDecisionCountRef.current) return;
    const newDecs = decisions.slice(0, decisions.length - lastDecisionCountRef.current);
    lastDecisionCountRef.current = decisions.length;
    for (const dec of newDecs) {
      push({
        type: 'AI',
        message: `AI Agent → ${dec.action} decision (confidence: ${(dec.confidence * 100).toFixed(0)}%)`,
        detail: dec.reasoning.slice(0, 120) + (dec.reasoning.length > 120 ? '…' : ''),
        slot: currentSlot
      });
      if (dec.outcome && dec.outcome.includes('retry')) {
        push({
          type: 'RETRY',
          message: `Retry Orchestrator → ${dec.outcome}`,
          detail: `Multiplier: ${dec.parameters.tipMultiplier}x · Target: p${dec.parameters.targetPercentile}`,
          slot: currentSlot
        });
      }
    }
  }, [decisions, push, currentSlot]);

  // Seed system startup message
  useEffect(() => {
    push({
      type: 'SYSTEM',
      message: '🟢 Solana Smart Transaction Infrastructure — Engine ONLINE',
      detail: 'Yellowstone Geyser stream active · Jito Tip Intelligence tracking · AI Recovery Agent ready',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const filtered = filter === 'ALL' ? entries : entries.filter(e => e.type === filter);

  return (
    <div className="bg-[#0b0b0c] border border-[#222224] rounded-[24px] shadow-2xl overflow-hidden relative" id="live-event-log">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.5)_2px,rgba(255,255,255,0.5)_4px)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1a1c] bg-[#0f0f10]">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#D4FF00]/80" />
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <Terminal className="h-3.5 w-3.5 text-[#D4FF00]" />
            <span className="text-[11px] font-mono font-bold text-[#D4FF00] uppercase tracking-widest">
              Live Event Pipeline
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="hidden sm:flex gap-1 text-[9px] font-mono">
            {(['ALL', 'SLOT', 'TIP', 'BUNDLE', 'LIFECYCLE', 'FAULT', 'AI', 'RETRY'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  filter === f
                    ? 'bg-[#D4FF00] text-black font-black'
                    : 'bg-[#1a1a1c] text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPaused(p => !p)}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
              paused
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                : 'border-[#222224] text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {paused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>

          <button
            onClick={() => setAutoScroll(a => !a)}
            className={`text-[9px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
              autoScroll
                ? 'border-[#D4FF00]/30 text-[#D4FF00] bg-[#D4FF00]/5'
                : 'border-[#222224] text-zinc-500'
            }`}
            title="Toggle auto-scroll"
          >
            <ChevronDown className="h-3 w-3" />
          </button>

          <span className="text-[9px] font-mono text-zinc-600">{filtered.length} events</span>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        className="h-64 overflow-y-auto font-mono text-[10px] leading-relaxed"
        onScroll={() => {
          if (!scrollRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-[10px] uppercase tracking-widest">
            Waiting for events…
          </div>
        ) : (
          <div className="space-y-0.5 p-3">
            {filtered.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type];
              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.02] group transition-colors`}
                >
                  {/* Timestamp */}
                  <span className="text-zinc-600 shrink-0 pt-0.5 tabular-nums">{entry.ts}</span>

                  {/* Type badge */}
                  <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${cfg.badge}`}>
                    {entry.type}
                  </span>

                  {/* Message */}
                  <div className="flex-1 min-w-0">
                    <span className={`${cfg.color} font-semibold`}>{entry.message}</span>
                    {entry.detail && (
                      <span className="text-zinc-600 block text-[9px] truncate group-hover:text-zinc-500 transition-colors mt-0.5">
                        {entry.detail}
                      </span>
                    )}
                  </div>

                  {/* Slot number */}
                  {entry.slot && (
                    <span className="text-zinc-700 shrink-0 tabular-nums text-[9px]">
                      #{entry.slot.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-[#1a1a1c] bg-[#0f0f10] text-[9px] font-mono text-zinc-600">
        <span>Slot: <span className="text-zinc-400">{currentSlot.toLocaleString()}</span></span>
        <span>p50: <span className="text-[#D4FF00]">{formatLamports(percentiles.p50)}</span> · p95: <span className="text-[#D4FF00]">{formatLamports(percentiles.p95)}</span> lam</span>
        <span>Congestion: <span className={congestionScore > 0.6 ? 'text-rose-400' : 'text-emerald-400'}>{(congestionScore * 100).toFixed(0)}%</span></span>
      </div>
    </div>
  );
}
