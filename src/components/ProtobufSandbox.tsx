import React, { useState, useEffect } from 'react';
import { Terminal, Shield, RefreshCw, Cpu, Layers, Sparkles, AlertTriangle } from 'lucide-react';

interface ProtobufSandboxProps {
  description: string;
  percentile: number;
  percentiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    p99: number;
  };
  congestionScore: number;
  onSetCustomTip: (lamports: number) => void;
  customTipLamports: number | null;
}

export default function ProtobufSandbox({
  description,
  percentile,
  percentiles,
  congestionScore,
  onSetCustomTip,
  customTipLamports
}: ProtobufSandboxProps) {
  const [serializedHex, setSerializedHex] = useState('');
  const [activeTab, setActiveTab] = useState<'PROTOBUF' | 'BYTECODE' | 'METRICS'>('PROTOBUF');

  const activeTipVal = customTipLamports !== null ? customTipLamports : (() => {
    const base = percentile === 50 ? percentiles.p50 : 
                 percentile === 95 ? percentiles.p95 : 
                 percentile === 99 ? percentiles.p99 : percentiles.p75;
    const multiplier = 1.0 + congestionScore * 1.5;
    return Math.round(base * multiplier);
  })();

  const formatSolValue = (lamports: number) => {
    return (lamports / 1000000000).toFixed(6) + " SOL";
  };

  // Generate simulated Solana tx hex based on current parameters 
  useEffect(() => {
    const encoder = new TextEncoder();
    const encodedPayload = encoder.encode(description || "Jito Bundle");
    const payloadLength = encodedPayload.length;
    
    // Build a unique Solana simulated hex string
    let hex = '01'; // packet structure signature
    hex += '02'; // number of signatures
    hex += Math.random().toString(16).substring(2, 10).toUpperCase(); // mock signature bits
    hex += '0000018a'; // Jito program ID mapping
    hex += payloadLength.toString(16).padStart(4, '0').toUpperCase(); // variable size descriptors
    hex += Array.from(encodedPayload).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().slice(0, 32);
    hex += 'EFBEADDE'; // magical transaction footer
    
    // Inject custom tip hex bits
    const tipHex = activeTipVal.toString(16).padStart(16, '0').toUpperCase();
    hex += tipHex;

    setSerializedHex(hex);
  }, [description, percentile, activeTipVal]);

  // Calculate estimated auction win probability
  const calculateWinProbability = () => {
    const activePercentile = customTipLamports !== null ? (() => {
      if (activeTipVal >= percentiles.p99) return 99;
      if (activeTipVal >= percentiles.p95) return 95;
      if (activeTipVal >= percentiles.p75) return 75;
      if (activeTipVal >= percentiles.p50) return 50;
      return 25;
    })() : percentile;

    let baseProb = 0;
    if (activePercentile >= 99) baseProb = 98;
    else if (activePercentile >= 95) baseProb = 92;
    else if (activePercentile >= 75) baseProb = 78;
    else if (activePercentile >= 50) baseProb = 45;
    else baseProb = 15;

    // Congestion degrades win probability if tip is low
    const penalty = congestionScore * (100 - baseProb) * 0.4;
    return Math.max(5, Math.min(99, Math.round(baseProb - penalty)));
  };

  const winProb = calculateWinProbability();

  // Create simulated protobuf json view
  const protobufSimStr = `{
  "protobuf": "solana.jito.geyser.v1.Bundle",
  "header": {
    "version": 1,
    "slot_cursor": 312450221,
    "tps_index": 2450
  },
  "bundle_payload": {
    "payload_bytes": "${description.length * 2 + 120} bytes",
    "instructions": [
      { "program_id": "SysvarClock11111111111111111111111111" },
      { "program_id": "JitpEffguxNpqB8bBTmMxBDKwhCTZFMGAccount" }
    ],
    "tip_payment": {
      "lamports": "${activeTipVal} (${formatSolValue(activeTipVal)})",
      "p25_benchmark": "${percentiles.p25}",
      "p99_benchmark": "${percentiles.p99}"
    },
    "congestion_modifier": "${congestionScore.toFixed(3)}x"
  },
  "sim_metadata": {
    "landing_probability": "${winProb}%",
    "compiler": "Helius-Protobuf-v2"
  }
}`;

  return (
    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl relative overflow-hidden" id="protobuf-sandbox">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4FF00]/2 rounded-full blur-2xl"></div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-[#222224]">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#D4FF00]/10 p-2 rounded-lg border border-[#D4FF00]/20">
            <Layers className="h-4 w-4 text-[#D4FF00] animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider">Jito Protobuf Compiler &amp; Sandbox</h4>
            <p className="text-[10px] text-[#888888]">Fine-tune auction tips and preview serialized package outputs live</p>
          </div>
        </div>

        <div className="flex gap-1 bg-[#1e1e21] border border-[#222224] rounded-lg p-0.5 text-[9px] font-mono">
          {(['PROTOBUF', 'BYTECODE', 'METRICS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 rounded cursor-pointer ${
                activeTab === tab ? 'bg-[#D4FF00] text-black font-extrabold' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Fine-Tuning Controls */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-[#1e1e21] border border-[#222224] rounded-xl p-4 relative">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-mono font-black text-white uppercase tracking-wider">Manual Tip Fine-Tuner</span>
              <span className="font-mono text-[#D4FF00] font-black">{formatSolValue(activeTipVal)}</span>
            </div>
            
            <input 
              type="range" 
              min={percentiles.p25} 
              max={percentiles.p99 * 1.5} 
              step="500000"
              value={activeTipVal}
              onChange={(e) => onSetCustomTip(parseInt(e.target.value))}
              className="w-full h-1 mt-4 bg-[#212124] rounded-lg cursor-pointer accent-[#D4FF00]"
            />
            
            <div className="flex justify-between font-mono text-[9px] text-[#666666] mt-2">
              <span>{formatSolValue(percentiles.p25)} (p25)</span>
              <span>{formatSolValue(percentiles.p50)} (p50)</span>
              <span>{formatSolValue(percentiles.p99)} (p99)</span>
            </div>

            {customTipLamports !== null && (
              <button 
                onClick={() => onSetCustomTip(null as any)}
                className="absolute top-4 right-4 bg-[#D4FF00]/10 text-[#D4FF00] hover:bg-[#D4FF00]/20 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase cursor-pointer"
                title="Reset to selected strategy preset"
              >
                Reset Preset
              </button>
            )}
          </div>

          {/* Win Probability and Payload Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e1e21] border border-[#222224] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] text-[#888888] font-mono uppercase font-bold tracking-wider">Estimated Landing Odds</span>
              <div>
                <span className={`text-2xl font-mono font-extrabold ${
                  winProb >= 85 ? 'text-[#D4FF00]' : winProb >= 50 ? 'text-cyan-400' : 'text-amber-400'
                }`}>{winProb}%</span>
                <span className="text-[9px] text-[#666666] block font-sans">Jito auction priority rating</span>
              </div>
            </div>

            <div className="bg-[#1e1e21] border border-[#222224] rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[9px] text-[#888888] font-mono uppercase font-bold tracking-wider">Payload Weight</span>
              <div>
                <span className="text-2xl font-mono font-extrabold text-[#c5c5c7]">{description.length * 2 + 132} B</span>
                <span className="text-[9px] text-[#666666] block font-sans">Simulated protobuf bytes pack</span>
              </div>
            </div>
          </div>

          <div className="bg-[#D4FF00]/5 border border-[#D4FF00]/15 rounded-xl p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-[#D4FF00] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#888888] leading-relaxed">
              Solana Smart Stream compiles payloads as system serialization vectors. Raising tip fees places transactions near validator block frontrunner headers.
            </p>
          </div>
        </div>

        {/* Live Terminal outputs */}
        <div className="md:col-span-6">
          {activeTab === 'PROTOBUF' && (
            <div className="relative">
              <div className="absolute top-2 right-2 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[8px] font-mono px-1.5 py-0.5 rounded">
                Protobuf definition JSON
              </div>
              <pre className="bg-[#0b0b0c] border border-[#222224] rounded-xl p-3 font-mono text-[9px] text-zinc-400 overflow-y-auto max-h-48 leading-relaxed terminal-scanline shadow-inner max-w-full">
                <code>{protobufSimStr}</code>
              </pre>
            </div>
          )}

          {activeTab === 'BYTECODE' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#0b0b0c] border border-[#222224] rounded-xl p-3 h-36 font-mono text-[9px] text-emerald-400 overflow-y-auto leading-relaxed overflow-x-hidden select-all relative terminal-scanline">
                <span className="break-all pr-4">{serializedHex}</span>
                <span className="absolute bottom-2 right-2 bg-[#222224] text-[#666666] text-[8px] px-1.5 py-0.5 rounded">HEX</span>
              </div>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide text-right">
                💡 Double click to copy raw transaction bytecode
              </p>
            </div>
          )}

          {activeTab === 'METRICS' && (
            <div className="bg-[#0b0b0c] border border-[#222224] rounded-xl p-3 h-36 flex flex-col justify-between font-mono text-[10px] text-zinc-400">
              <div className="space-y-1.5">
                <div className="flex justify-between border-b border-[#222224]/50 pb-1">
                  <span>Protobuf Version:</span>
                  <span className="text-white font-bold">1.4.2-beta</span>
                </div>
                <div className="flex justify-between border-b border-[#222224]/50 pb-1">
                  <span>Signature Payload Size:</span>
                  <span className="text-white font-bold">64 Bytes</span>
                </div>
                <div className="flex justify-between border-b border-[#222224]/50 pb-1">
                  <span>Calculated Fee Rate:</span>
                  <span className="text-white font-bold">{formatSolValue(Math.round(activeTipVal / 100))} (Base Fee)</span>
                </div>
                <div className="flex justify-between border-b border-[#222224]/50 pb-1">
                  <span>Validator Priority Rank:</span>
                  <span className="text-[#D4FF00] font-black">
                    {activeTipVal >= percentiles.p95 ? 'TOP 3%' : activeTipVal >= percentiles.p75 ? 'TOP 10%' : 'STANDARD'}
                  </span>
                </div>
              </div>
              <span className="text-[8px] text-[#666666] block uppercase tracking-wide text-center">
                System telemetry connection active via Triton Geyser RPC
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
