import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { 
  Play, Cpu, Brain, History, Award, CheckCircle2, 
  HelpCircle, Sparkles, Sliders, AlertTriangle, ShieldCheck,
  RefreshCw, Info, Wifi, Globe, MapPin, ChevronDown, Activity, TrendingUp,
  Download, FileCheck2, Rocket, FlaskConical
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
import LiveEventLog from './components/LiveEventLog';

const ThreeDBlockVisualizer = lazy(() => import('./components/ThreeDBlockVisualizer'));

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
  const [snapshots, setSnapshots] = useState<TipSnapshot[]>([]);
  const [activeFault, setActiveFault] = useState<string | null>(null);
  const [isLiveConnection, setIsLiveConnection] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [infrastructureMode, setInfrastructureMode] = useState<'LIVE_INFRASTRUCTURE' | 'COMPETITION_SIMULATOR'>('COMPETITION_SIMULATOR');
  const [capabilities, setCapabilities] = useState<Record<string, string>>({});
  const [demoRunning, setDemoRunning] = useState(false);
  const [dispatchPercentile, setDispatchPercentile] = useState<number>(75);
  const [customTipLamports, setCustomTipLamports] = useState<number | null>(null);
  const [description, setDescription] = useState<string>("Jupiter Aggregator Swap (Raydium Vault Router)");
  const [activeRpc, setActiveRpc] = useState(rpcNodes[0]);
  const [rpcDropdownOpen, setRpcDropdownOpen] = useState(false);
  const rpcDropdownRef = useRef<HTMLDivElement>(null);

  const failedBundles = bundles.filter((b) => ['FAILED', 'ABANDONED'].includes(b.status)).length;
  const activeBundles = bundles.filter((b) => ['SUBMITTED', 'PROCESSED', 'CONFIRMED'].includes(b.status)).length;
  const recommendedTip =
    health.congestionScore > 0.7 ? 'p99' : health.congestionScore > 0.45 ? 'p95' : `p${dispatchPercentile}`;
  const operatorState =
    activeFault ? 'Fault recovery active' :
    health.congestionScore > 0.7 ? 'High contention' :
    activeBundles > 0 ? 'Bundles in flight' :
    'Nominal operations';

  // Close RPC dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rpcDropdownRef.current && !rpcDropdownRef.current.contains(e.target as Node)) {
        setRpcDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

      // 4. Fetch tip history snapshots
      const snapshotsRes = await fetch("/api/snapshots");
      const snapshotsData = await snapshotsRes.json();
      setSnapshots(snapshotsData);

      // Check if real Claude key is active
      const healthRes = await fetch("/api/health");
      const healthData = await healthRes.json();
      setIsLiveConnection(healthData.aiMode === "LIVE_CLAUDE_API");
      setInfrastructureMode(healthData.infrastructureMode || "COMPETITION_SIMULATOR");
      setCapabilities(healthData.capabilities || {});
      
      setConnectionError(null);
      setLoading(false);
    } catch (err) {
      console.error("Express API connection loss, retrying:", err);
      setConnectionError("Failed to connect to the backend server. If you deployed this to a static host (like Vercel), ensure you are running the full Node.js Express server.");
      setLoading(false);
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

  const handleRunDemoGauntlet = async () => {
    setDemoRunning(true);
    try {
      await fetch("/api/demo/gauntlet", { method: "POST" });
      setTimeout(() => {
        fetchState();
        setDemoRunning(false);
      }, 7500);
    } catch (err) {
      console.error("Demo gauntlet error:", err);
      setDemoRunning(false);
    }
  };

  const handleExportEvidence = async () => {
    try {
      const res = await fetch("/api/evidence");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `solana-smart-stack-evidence-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Evidence export error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col font-sans overflow-x-hidden" id="applet-root">
      
      {/* Top Header Workspace Status bar */}
      <header className="bg-[#121214] border-b border-[#222224] sticky top-0 z-40 relative overflow-hidden" id="global-header">
        <div className="absolute bottom-0 left-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/40 to-transparent w-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 bg-[#D4FF00]/10 rounded-lg flex items-center justify-center border border-[#D4FF00]/30 relative shadow-inner shrink-0">
              <Cpu className="h-5 w-5 text-[#D4FF00] drop-shadow-[0_0_8px_#D4FF00]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-[#D4FF00] rounded-full border-2 border-[#121214] animate-pulse"></span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-white tracking-widest leading-none uppercase font-mono truncate">
                  Solana <span className="text-[#D4FF00]">Jito</span>-Stream
                </h1>
                <span className={`hidden sm:inline-flex text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                  infrastructureMode === 'LIVE_INFRASTRUCTURE'
                    ? 'bg-[#D4FF00]/10 border-[#D4FF00]/20 text-[#D4FF00]'
                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                }`}>
                  {infrastructureMode === 'LIVE_INFRASTRUCTURE' ? 'LIVE INFRA' : 'SIM MODE'}
                </span>
              </div>
              <p className="text-[11px] text-[#888888] mt-1 font-sans truncate">
                {infrastructureMode === 'LIVE_INFRASTRUCTURE'
                  ? 'Live Geyser ingest - AI recovery agent'
                  : 'Offline infra simulator - AI recovery agent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6 shrink-0">
            {/* Real-time telemetry widgets inside header for peak pro vibe */}
            <div className="hidden lg:flex items-center gap-4 border-l border-[#222224] pl-6 font-mono text-[11px]">
              <div>
                <div className="text-[9px] text-[#666666] uppercase font-bold">STREAM SPEED</div>
                <div className="text-white font-extrabold">{health.tps.toLocaleString()} TPS</div>
              </div>
              <div>
                <div className="text-[9px] text-[#666666] uppercase font-bold">SLOT SPEED</div>
                <div className="text-white font-extrabold">{health.slotDurationMs}ms</div>
              </div>
            </div>

            {/* Hot-swappable Inflow RPC Node Selector */}
            <div className="relative font-mono text-[11px]" id="rpc-node-selector-container" ref={rpcDropdownRef}>
              <button
                type="button"
                onClick={() => setRpcDropdownOpen(!rpcDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e1e21] border border-[#222224] hover:border-[#D4FF00]/40 transition-all cursor-pointer text-zinc-200"
              >
                <Wifi className="h-3 w-3 text-[#D4FF00] animate-pulse" />
                <span className="font-extrabold uppercase text-[9px] hidden lg:inline">{activeRpc.name}</span>
                <span className="font-extrabold uppercase text-[9px] lg:hidden">RPC</span>
                <span className="text-[9px] text-zinc-400 font-bold">({activeRpc.latency}ms)</span>
                <ChevronDown className="h-3 w-3 text-[#D4FF00]" />
              </button>

              {rpcDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#121214] border border-[#222224] rounded-lg shadow-2xl p-2 z-50">
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
                      className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-[#1e1e21] group text-left transition-colors cursor-pointer ${
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
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e21] border border-[#222224] shadow-md">
              <ShieldCheck className={`h-4 w-4 ${isLiveConnection ? 'text-purple-400' : 'text-amber-400'}`} />
              <span className="text-[9px] font-mono font-extrabold text-zinc-300 leading-none tracking-wider font-mono">
                AI COCKPIT: {isLiveConnection ? 'LIVE CLAUDE' : 'HEURISTIC AGENT'}
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
        <div className="flex space-x-1 border-b border-[#222224] mb-6 overflow-x-auto" id="nav-tabs">
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
                className={`flex shrink-0 items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold tracking-wide transition-all uppercase cursor-pointer select-none ${
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
        ) : connectionError ? (
          <div className="flex flex-col items-center justify-center py-24 text-red-500 space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg max-w-lg text-center">
              <h3 className="font-bold text-lg mb-2">Backend Connection Failed</h3>
              <p className="text-sm opacity-80">{connectionError}</p>
              <p className="text-sm opacity-80 mt-4 font-mono bg-black/50 p-3 rounded">
                This app requires a stateful Node.js backend to run the simulation loop. It cannot be hosted on purely static CDNs. 
                Use Render, Railway, or a VPS with <span className="text-[#D4FF00]">npm run start</span>.
              </p>
            </div>
          </div>
        ) : (
          <div id="tab-viewport">
            
            {/* 1. Dashboard Tab */}
            {currentTab === 'OVERVIEW' && (
              <div className="space-y-6" id="tab-overview">
                <section className="bg-[#121214] border border-cyan-500/20 rounded-lg p-4 shadow-2xl relative overflow-hidden" id="judge-demo-console">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400 via-[#D4FF00] to-purple-400" />
                  <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 items-center">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-5 w-5 text-cyan-300" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-mono font-black uppercase tracking-wider text-white">Competition Simulator Mode Evidence Console</h2>
                          <span className="text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                            No paid infra required
                          </span>
                        </div>
                        <p className="text-[11px] text-[#888888] mt-1 leading-relaxed max-w-3xl">
                          This mode is explicit: it replays the same operational problems the bounty asks for locally, including leader windows,
                          dynamic tip floors, blockhash expiry, low-tip auction loss, skipped leaders, AI decisions, retries, and lifecycle evidence.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleRunDemoGauntlet}
                        disabled={demoRunning}
                        className="bg-[#D4FF00] text-black rounded-lg px-4 py-3 font-mono font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {demoRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                        {demoRunning ? 'Running gauntlet' : 'Run judge gauntlet'}
                      </button>
                      <button
                        type="button"
                        onClick={handleExportEvidence}
                        className="bg-[#1e1e21] border border-[#222224] hover:border-cyan-500/40 text-cyan-300 rounded-lg px-4 py-3 font-mono font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                        Export evidence
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                    {[
                      { label: 'Stream layer', value: capabilities.geyserStream || 'simulated slot and tip stream' },
                      { label: 'Jito layer', value: capabilities.jitoSubmission || 'simulated block-engine queue' },
                      { label: 'AI layer', value: capabilities.aiDecisioning || (isLiveConnection ? 'live Claude API' : 'deterministic heuristic agent') },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#0b0b0c] border border-[#222224] rounded-lg p-3 flex items-start gap-2">
                        <FileCheck2 className="h-4 w-4 text-[#D4FF00] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[9px] text-[#666666] font-mono uppercase tracking-wider font-bold">{item.label}</p>
                          <p className="text-[11px] text-zinc-300 mt-0.5 capitalize">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-4 gap-3" aria-label="Operator summary">
                  {[
                    { label: 'Operator State', value: operatorState, icon: Activity, tone: activeFault ? 'text-amber-400' : 'text-[#D4FF00]' },
                    { label: 'Recommended Tip', value: recommendedTip, icon: TrendingUp, tone: recommendedTip === 'p99' ? 'text-amber-400' : 'text-[#D4FF00]' },
                    { label: 'Active Bundles', value: activeBundles.toString(), icon: RefreshCw, tone: activeBundles > 0 ? 'text-cyan-400' : 'text-zinc-300' },
                    { label: 'Failed / Abandoned', value: failedBundles.toString(), icon: AlertTriangle, tone: failedBundles > 0 ? 'text-rose-400' : 'text-zinc-300' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="bg-[#121214] border border-[#222224] rounded-lg px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-[#666666] uppercase tracking-wider font-mono font-bold">{item.label}</p>
                          <p className={`mt-1 text-sm font-mono font-black uppercase ${item.tone}`}>{item.value}</p>
                        </div>
                        <Icon className={`h-4 w-4 ${item.tone}`} />
                      </div>
                    );
                  })}
                </section>

                {/* Stats widgets */}
                <NetworkStats 
                  currentSlot={currentSlot}
                  leaderContext={leaderContext}
                  health={health}
                  activeFault={activeFault}
                  infrastructureMode={infrastructureMode}
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
                    <div className="bg-[#121214] border border-[#222224] rounded-lg p-6 shadow-2xl">
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
                      <BundleFeed bundles={bundles.slice(0, 5)} compact />
                    </div>

                    {/* Live Event Pipeline Log */}
                    <LiveEventLog
                      currentSlot={currentSlot}
                      bundles={bundles}
                      decisions={decisions}
                      percentiles={percentiles}
                      congestionScore={health.congestionScore}
                    />
                  </div>

                  {/* Right matrix column */}
                  <div className="lg:col-span-1 space-y-6">
                    <Suspense
                      fallback={
                        <div className="h-[360px] bg-[#121214] border border-[#222224] rounded-lg shadow-2xl flex items-center justify-center text-[#888888] font-mono text-[11px] uppercase tracking-wider">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin text-[#D4FF00]" />
                          Loading 3D block engine arena
                        </div>
                      }
                    >
                      <ThreeDBlockVisualizer 
                        currentSlot={currentSlot}
                        congestionScore={health.congestionScore}
                        latestBundles={bundles}
                      />
                    </Suspense>

                    <TipPercentilesWidget 
                      percentiles={percentiles}
                      congestionScore={health.congestionScore}
                      selectedPercentile={dispatchPercentile}
                      onSelectPercentile={setDispatchPercentile}
                      snapshots={snapshots}
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
          <p className="text-[#888888]">Offline simulator with live-compatible Yellowstone and Jito service boundaries.</p>
          <p className="pt-2 text-[10px] font-mono text-[#D4FF00] uppercase tracking-wider">Built to demonstrate transaction infrastructure decisions without paid infra.</p>
        </div>
      </footer>

    </div>
  );
}
