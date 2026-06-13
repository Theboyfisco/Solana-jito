import React, { useState, useEffect } from 'react';
import { 
  Play, Cpu, Brain, History, Award, CheckCircle2, 
  HelpCircle, Sparkles, Sliders, AlertTriangle, ShieldCheck,
  RefreshCw, Info, Wifi, Globe, MapPin, ChevronDown
} from 'lucide-react';
import { Bundle, AgentDecision, TipSnapshot, NetworkHealth, JitoLeaderSchedule } from './types';
import NetworkStats from './components/NetworkStats';
import TipPercentilesWidget from './components/TipPercentilesWidget';
import FaultControls from './components/FaultControls';
import BundleFeed from './components/BundleFeed';
import AiDecisions from './components/AiDecisions';
import BountyQuestions from './components/BountyQuestions';
import ProtobufSandbox from './components/ProtobufSandbox';
import AiTuningStudio from './components/AiTuningStudio';
import ThreeDBlockVisualizer from './components/ThreeDBlockVisualizer';

const rpcNodes = [
  { name: "Triton Mainnet (Tokyo)", latency: 38, location: "Tokyo, JP" },
  { name: "Helius Geyser (US-East)", latency: 15, location: "Virginia, US" },
  { name: "Jito BlockEngine (Frankfurt)", latency: 84, location: "Frankfurt, DE" },
  { name: "Triton Local Ingress", latency: 1, location: "Local Sandbox" }
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'OVERVIEW' | 'LEDGER' | 'AI' | 'BOUNTY'>('OVERVIEW');
  const [currentSlot, setCurrentSlot] = useState<number>(312450000);
  const [leaderContext, setLeaderContext] = useState<JitoLeaderSchedule>({
    currentLeader: "Jito Validator",
    nextLeader: "SolNode-2",
    nextJitoLeader: "Laine (Jito)",
    nextJitoLeaderSlot: 312450012,
    slotsUntilJitoLeader: 12
  });
  const [percentiles, setPercentiles] = useState({
    p25: 1000000,
    p50: 3400000,
    p75: 7500000,
    p95: 25000000,
    p99: 80000000
  });
  const [health, setHealth] = useState<NetworkHealth>({
    congestionScore: 0.35,
    avgProcessedToConfirmedMs: 1450,
    recentLandingRate: 0.90,
    slotDurationMs: 400,
    tps: 2450
  });
  
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [activeFault, setActiveFault] = useState<string | null>(null);
  const [isLiveConnection, setIsLiveConnection] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [dispatchPercentile, setDispatchPercentile] = useState<number>(75);
  const [customTipLamports, setCustomTipLamports] = useState<number | null>(null);
  const [description, setDescription] = useState<string>("Jupiter Aggregator Swap (Raydium Vault Router)");
  const [activeRpc, setActiveRpc] = useState(rpcNodes[0]);
  const [rpcDropdownOpen, setRpcDropdownOpen] = useState(false);

  // Poll simulator state from the Express backend
  const fetchState = async () => {
    try {
      // 1. Fetch system state (slots, leader schedule, percentiles)
      const stateRes = await fetch("/api/state");
      const stateData = await stateRes.json();
      setCurrentSlot(stateData.currentSlot);
      setLeaderContext(stateData.leaderContext);
      setPercentiles(stateData.percentiles);
      setHealth(stateData.health);

      // 2. Fetch Jito Bundle log
      const bundlesRes = await fetch("/api/bundles");
      const bundlesData = await bundlesRes.json();
      setBundles(bundlesData);

      // 3. Fetch AI Agent Decisions
      const decisionsRes = await fetch("/api/decisions");
      const decisionsData = await decisionsRes.json();
      setDecisions(decisionsData);

      // Check if real Gemini key is active
      const healthRes = await fetch("/api/health");
      const healthData = await healthRes.json();
      setIsLiveConnection(healthData.aiMode === "LIVE_GEMINI_API");
      
      setLoading(false);
    } catch (err) {
      console.error("Express API connection loss, retrying:", err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500); // 1.5s live polling
    return () => clearInterval(interval);
  }, []);

  // Submit manual transaction payload
  const handleManualSubmit = async (targetPct: number, desc: string) => {
    try {
      const requestPayload: any = { percentile: targetPct, description: desc };
      if (customTipLamports !== null) {
        requestPayload.tipLamports = customTipLamports;
      }
      const res = await fetch("/api/submit-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });
      const data = await res.json();
      if (data.success) {
        setCustomTipLamports(null);
        fetchState();
      }
    } catch (err) {
      console.error("Submit error:", err);
    }
  };

  // Set Congestion
  const handleSetCongestion = async (score: number) => {
    try {
      const res = await fetch("/api/congestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score })
      });
      const data = await res.json();
      if (data.success) {
        setHealth(data.health);
      }
    } catch (err) {
      console.error("Congestion update loss:", err);
    }
  };

  // Inject fault
  const handleInjectFault = async (scenario: 'BLOCKHASH_EXPIRY' | 'LOW_TIP' | 'LEADER_SKIP') => {
    try {
      const res = await fetch("/api/inject-fault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFault(scenario);
        setTimeout(() => setActiveFault(null), 8000); // clear UI warning after some time
        fetchState();
      }
    } catch (err) {
      console.error("Fault injection loss:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col font-sans" id="applet-root">
      
      {/* Top Header Workspace Status bar */}
      <header className="bg-[#121214] border-b border-[#222224] sticky top-0 z-40 relative overflow-hidden" id="global-header">
        <div className="absolute bottom-0 left-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/40 to-transparent w-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 bg-[#D4FF00]/10 rounded-xl flex items-center justify-center border border-[#D4FF00]/30 relative shadow-inner">
              <Cpu className="h-5 w-5 text-[#D4FF00] drop-shadow-[0_0_8px_#D4FF00]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-[#D4FF00] rounded-full border-2 border-[#121214] animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-white tracking-widest leading-none uppercase font-mono">
                  Solana <span className="text-[#D4FF00]">Jito</span>-Stream
                </h1>
                <span className="bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  MAINNET ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-[#888888] mt-1 font-sans">
                Continuous Geyser Ingest &bull; AI Recovery Agent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Real-time telemetry widgets inside header for peak pro vibe */}
            <div className="hidden lg:flex items-center gap-4 border-l border-[#222224] pl-6 font-mono text-[11px]">
              <div>
                <div className="text-[9px] text-[#666666] uppercase font-bold">GEYSER SPEED</div>
                <div className="text-white font-extrabold">{health.tps.toLocaleString()} TPS</div>
              </div>
              <div>
                <div className="text-[9px] text-[#666666] uppercase font-bold">SLOT SPEED</div>
                <div className="text-white font-extrabold">{health.slotDurationMs}ms</div>
              </div>
            </div>

            {/* Hot-swappable Inflow RPC Node Selector */}
            <div className="relative font-mono text-[11px]" id="rpc-node-selector-container">
              <button
                type="button"
                onClick={() => setRpcDropdownOpen(!rpcDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1e1e21] border border-[#222224] hover:border-[#D4FF00]/40 transition-all cursor-pointer text-zinc-200"
              >
                <Wifi className="h-3 w-3 text-[#D4FF00] animate-pulse" />
                <span className="font-extrabold uppercase text-[9px] hidden lg:inline">{activeRpc.name}</span>
                <span className="font-extrabold uppercase text-[9px] lg:hidden">RPC</span>
                <span className="text-[9px] text-zinc-400 font-bold">({activeRpc.latency}ms)</span>
                <ChevronDown className="h-3 w-3 text-[#D4FF00]" />
              </button>

              {rpcDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#121214] border border-[#222224] rounded-xl shadow-2xl p-2 z-50">
                  <div className="px-2 py-1.5 text-[9px] text-[#666666] font-bold uppercase tracking-wider border-b border-[#222224] mb-1">
                    Select Geyser RPC Source
                  </div>
                  {rpcNodes.map((node) => (
                    <button
                      key={node.name}
                      type="button"
                      onClick={() => {
                        setActiveRpc(node);
                        setRpcDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#1e1e21] group text-left transition-colors cursor-pointer ${
                        activeRpc.name === node.name ? 'bg-[#1e1e21]' : ''
                      }`}
                    >
                      <div>
                        <span className={`block font-bold text-[10px] group-hover:text-[#D4FF00] ${
                          activeRpc.name === node.name ? 'text-[#D4FF00]' : 'text-zinc-200'
                        }`}>
                          {node.name}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-sans block mt-0.5">{node.location}</span>
                      </div>
                      <span className="text-[9px] font-black text-[#666666] group-hover:text-zinc-300">
                        {node.latency}ms
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status node */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e1e21] border border-[#222224] shadow-md">
              <ShieldCheck className={`h-4 w-4 ${isLiveConnection ? 'text-purple-400' : 'text-amber-400'}`} />
              <span className="text-[9px] font-mono font-extrabold text-zinc-300 leading-none tracking-wider font-mono">
                AI COCKPIT: {isLiveConnection ? 'LIVE GEMINI' : 'HEURISTIC AGENT'}
              </span>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-mono text-[#666666] font-bold uppercase tracking-wider">EPOCH PROGRESS</div>
              <div className="text-xs font-mono font-black text-[#D4FF00]">Slot #{(currentSlot % 432000).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-b border-[#222224] mb-6" id="nav-tabs">
          {[
            { id: 'OVERVIEW', label: 'Monitor Dashboard', icon: Cpu },
            { id: 'LEDGER', label: 'Smart Bundle Ledger', icon: History },
            { id: 'AI', label: 'AI Agent Mind', icon: Brain },
            { id: 'BOUNTY', label: 'Bounty Explanations', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold tracking-wide transition-all uppercase cursor-pointer select-none ${
                  isActive
                    ? 'border-[#D4FF00] text-[#D4FF00] font-black bg-[#121214]/40'
                    : 'border-transparent text-zinc-500 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#D4FF00]' : 'text-zinc-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Components */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-[#D4FF00]" />
            <p className="text-xs font-mono uppercase tracking-wider">Connecting to the Yellowstone Stream Ingestion node...</p>
          </div>
        ) : (
          <div id="tab-viewport">
            
            {/* 1. Dashboard Tab */}
            {currentTab === 'OVERVIEW' && (
              <div className="space-y-6" id="tab-overview">
                {/* Stats widgets */}
                <NetworkStats 
                  currentSlot={currentSlot}
                  leaderContext={leaderContext}
                  health={health}
                  activeFault={activeFault}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Controls column */}
                  <div className="lg:col-span-2 space-y-6">
                    <FaultControls 
                      onInjectFault={handleInjectFault}
                      onSetCongestion={handleSetCongestion}
                      onSubmitBundle={handleManualSubmit}
                      congestionScore={health.congestionScore}
                      percentile={dispatchPercentile}
                      onPercentileChange={setDispatchPercentile}
                      description={description}
                      onDescriptionChange={setDescription}
                    />

                    {/* Highly Interactive Protobuf Sandbox & Bytecode Compiler! */}
                    <ProtobufSandbox 
                      description={description}
                      percentile={dispatchPercentile}
                      percentiles={percentiles}
                      congestionScore={health.congestionScore}
                      onSetCustomTip={setCustomTipLamports}
                      customTipLamports={customTipLamports}
                    />

                    {/* Quick overview of latest bundle states */}
                    <div className="bg-[#121214] border border-[#222224] rounded-[24px] p-6 shadow-2xl">
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#222224]">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase font-mono tracking-wider">
                          <History className="h-4 w-4 text-[#D4FF00]" /> Latest Activity
                        </div>
                        <button 
                          onClick={() => setCurrentTab('LEDGER')}
                          className="text-[#D4FF00] hover:text-[#D4FF00]/80 text-xs font-bold uppercase tracking-wider cursor-pointer font-mono"
                        >
                          View complete ledger &rarr;
                        </button>
                      </div>
                      <BundleFeed bundles={bundles.slice(0, 5)} />
                    </div>
                  </div>

                  {/* Right matrix column */}
                  <div className="lg:col-span-1 space-y-6">
                    <ThreeDBlockVisualizer 
                      currentSlot={currentSlot}
                      congestionScore={health.congestionScore}
                      latestBundles={bundles}
                    />

                    <TipPercentilesWidget 
                      percentiles={percentiles}
                      congestionScore={health.congestionScore}
                      selectedPercentile={dispatchPercentile}
                      onSelectPercentile={setDispatchPercentile}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Full Ledger Tab */}
            {currentTab === 'LEDGER' && (
              <div id="tab-ledger">
                <BundleFeed bundles={bundles} />
              </div>
            )}

            {/* 3. AI Decisions Monitor */}
            {currentTab === 'AI' && (
              <div id="tab-ai" className="space-y-6">
                <AiTuningStudio />
                <AiDecisions decisions={decisions} />
              </div>
            )}

            {/* 4. Bounty Explanations */}
            {currentTab === 'BOUNTY' && (
              <div id="tab-bounty">
                <BountyQuestions />
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-[#121214] border-t border-[#222224] py-8 mt-12 text-center text-xs text-[#666666] font-sans" id="global-footer">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="uppercase tracking-wider font-bold text-zinc-400 text-[11px]">&copy; 2026 Solana Smart Transaction Infrastructure Stack</p>
          <p className="text-[#888888]">Powered by Triton Yellowstone &amp; Jito Block Engine.</p>
          <p className="pt-2 text-[10px] font-mono text-[#D4FF00] uppercase tracking-wider">Designed for performance, built to win.</p>
        </div>
      </footer>

    </div>
  );
}
