import React from 'react';
import { Cpu, RefreshCw, Zap, TrendingUp, AlertTriangle, Radio, GitFork, ArrowRight, ShieldAlert } from 'lucide-react';
import { NetworkHealth, JitoLeaderSchedule } from '../types';

interface NetworkStatsProps {
  currentSlot: number;
  leaderContext: JitoLeaderSchedule;
  health: NetworkHealth;
  activeFault: string | null;
}

export default function NetworkStats({ currentSlot, leaderContext, health, activeFault }: NetworkStatsProps) {
  const landingRatePct = (health.recentLandingRate * 100).toFixed(0);
  
  // Calculate relative positions for the mock pipeline ticks
  const futureTicks = [
    currentSlot + 1,
    currentSlot + 2,
    currentSlot + 3,
    currentSlot + 4,
  ];

  return (
    <div className="space-y-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Slot Card */}
        <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#D4FF00]/40 group" id="slot-card">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#D4FF00] to-transparent opacity-70"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#888888] uppercase">SOLANA CURRENT SLOT</span>
            <div className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4FF00]"></span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-mono font-extrabold text-white tracking-tight">{currentSlot.toLocaleString()}</h2>
            <p className="text-xs text-[#888888] mt-2 flex items-center gap-1.5 font-mono">
              <RefreshCw className="h-3 w-3 animate-spin text-[#D4FF00]" />
              Live Yellowstone Stream
            </p>
          </div>
        </div>

        {/* Jito Leader Card */}
        <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#D4FF00]/40" id="jito-leader-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#888888] uppercase">NEXT JITO LEADER</span>
            <Cpu className="h-4 w-4 text-[#D4FF00]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-mono font-extrabold text-[#D4FF00]">
                {leaderContext.slotsUntilJitoLeader}
              </span>
              <span className="text-xs text-[#888888] font-mono uppercase font-bold">slots left</span>
            </div>
            <p className="text-xs font-semibold text-gray-300 mt-2 truncate font-mono">
              Slot {leaderContext.nextJitoLeaderSlot} · {leaderContext.nextJitoLeader}
            </p>
          </div>
          {leaderContext.slotsUntilJitoLeader <= 2 && (
            <div className="absolute inset-x-0 bottom-0 bg-[#D4FF00]/10 text-[#D4FF00] text-[10px] font-mono py-1.5 px-3 text-center border-t border-[#D4FF00]/20 flex items-center justify-center gap-1.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00]"></span>
              Leader Approaching: Jito Gates Open
            </div>
          )}
        </div>

        {/* Congestion load */}
        <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#D4FF00]/40" id="congestion-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#888888] uppercase">CONGESTION SCORE</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-sans font-extrabold text-white">
                {(health.congestionScore * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-[#888888] font-mono uppercase font-bold">
                {health.congestionScore > 0.6 ? 'CRITICAL' : health.congestionScore > 0.3 ? 'STEADY' : 'IDEAL'}
              </span>
            </div>
            {/* Custom bento style micro slider */}
            <div className="w-full bg-[#222224] h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  health.congestionScore > 0.6 ? 'bg-amber-400' : 'bg-[#D4FF00]'
                }`}
                style={{ width: `${health.congestionScore * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Global Landing Rate */}
        <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#D4FF00]/40" id="landing-rate-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#888888] uppercase">JITO LANDING RATE</span>
            <TrendingUp className="h-4 w-4 text-[#D4FF00]" />
          </div>
          <div>
            <h2 className="text-4xl font-mono font-bold text-white tracking-tight">{landingRatePct}%</h2>
            <p className="text-xs text-[#888888] mt-2 font-mono uppercase">
              Confirmed last 10 bundles
            </p>
          </div>
          {activeFault && (
            <div className="absolute inset-x-0 bottom-0 bg-amber-500/15 text-amber-400 text-[10px] font-mono py-1.5 px-3 text-center border-t border-amber-500/20 flex items-center justify-center gap-1.5 truncate">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>FAULT ACTIVE: {activeFault}</span>
            </div>
          )}
        </div>
      </div>

      {/* Yellowstone Live Stream Pipeline Track - UI & UX highlight! */}
      <div className="bg-[#121214] border border-[#222224]/80 rounded-[20px] p-5 relative overflow-hidden grid-mesh">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#D4FF00]/10 p-2 rounded-lg border border-[#D4FF00]/20">
              <Radio className="h-4 w-4 text-[#D4FF00] animate-pulse" />
            </div>
            <div>
              <h4 className="text-[11px] font-mono font-black text-white uppercase tracking-wider">Triton Yellowstone Ingestion Pipeline</h4>
              <p className="text-[10px] text-[#888888] font-sans">Decoding live Mainnet-Beta protobuf notifications on-the-fly</p>
            </div>
          </div>

          <div className="w-full lg:w-auto flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 font-mono text-[10px]">
            {/* Decoded slot state indicator timeline */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-[#D4FF00] text-black font-black px-1.5 py-0.5 rounded text-[9px]">DECODED</span>
              <span className="text-white font-mono font-bold">Slot {currentSlot}</span>
            </div>
            
            <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />

            {futureTicks.map((tickVal, index) => {
              const isNextLeader = tickVal === leaderContext.nextJitoLeaderSlot;
              return (
                <React.Fragment key={tickVal}>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border shrink-0 ${
                    isNextLeader 
                      ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-[#D4FF00] animate-pulse font-bold'
                      : 'border-[#222224] bg-[#1e1e21] text-zinc-400'
                  }`}>
                    {isNextLeader && <Cpu className="h-3 w-3" />}
                    <span>Slot {tickVal}</span>
                    <span className="text-[8px] opacity-70">
                      {isNextLeader ? 'JITO' : `+${index + 1}`}
                    </span>
                  </div>
                  {index < futureTicks.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-zinc-800 shrink-0" />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
