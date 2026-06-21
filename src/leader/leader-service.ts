import { streamBus } from '../stream/stream';
import { Connection } from '@solana/web3.js';

// Simulated current slot (maintained by Yellowstone stream or fallback)
export let currentSlot = 312450000;

export interface LeaderContext {
  currentLeader: string;
  nextLeader: string;
  nextJitoLeader: string;
  nextJitoLeaderSlot: number;
  slotsUntilJitoLeader: number;
}

// Known Jito Validators (subset of mainnet keys)
const JITO_VALIDATORS = new Set([
  "Chorus1111111111111111111111111111111111111", 
  "Laine11111111111111111111111111111111111111",
  "Jito111111111111111111111111111111111111111",
  // Mock pubkeys for representation
]);

const VALIDATORS = [
  "Validator-A", "Validator-B (Jito)", "Validator-C", "Validator-D (Jito)",
  "SolanaCompass", "Laine (Jito)", "Validator-E", "Validator-F", "JitoSolo-4", "StakeHaus (Jito)"
];
const windowSize = 12;

let connection: Connection | null = null;
let leaderSchedule: string[] = [];

export function initLeaderService() {
  const rpcUrl = process.env.RPC_URL;
  if (rpcUrl) {
    connection = new Connection(rpcUrl, 'confirmed');
  }

  streamBus.on('slot', async (data: any) => {
    // In live mode, data is the slot number. In mock, it's an object with slot.
    const slot = typeof data === 'object' ? data.slot : data;
    currentSlot = slot;
    
    // Periodically fetch the real slot leaders from the RPC
    if (connection && (leaderSchedule.length === 0 || slot % 50 === 0)) {
      try {
        const leaders = await connection.getSlotLeaders(slot, 50);
        leaderSchedule = leaders.map(pk => pk.toBase58());
      } catch (e) {
        // Fallback or ignore
      }
    }

    const context = getLeaderContext();
    if (context.slotsUntilJitoLeader <= 5) {
      streamBus.emit('jitoLeaderApproaching', context);
    }
  });
}

export function getLeaderContext(): LeaderContext {
  if (leaderSchedule && leaderSchedule.length > 0) {
    const currentLeader = leaderSchedule[0] || "Unknown";
    const nextLeader = leaderSchedule[1] || "Unknown";
    // Find next Jito leader in the cached schedule
    let jitoIndex = -1;
    for (let i = 0; i < leaderSchedule.length; i++) {
      if (JITO_VALIDATORS.has(leaderSchedule[i])) {
        jitoIndex = i;
        break;
      }
    }
    
    // Fallback if no Jito leader in the next 50 slots (rare)
    if (jitoIndex === -1) jitoIndex = 12;

    return {
      currentLeader,
      nextLeader,
      nextJitoLeader: jitoIndex !== -1 && jitoIndex < leaderSchedule.length ? leaderSchedule[jitoIndex] : "Laine (Jito)",
      nextJitoLeaderSlot: currentSlot + jitoIndex,
      slotsUntilJitoLeader: jitoIndex
    };
  }

  // Fallback Mock Logic
  const currentLeaderIndex = Math.floor(currentSlot / 4) % VALIDATORS.length;
  const nextJitoLeaderSlot = Math.ceil(currentSlot / windowSize) * windowSize;
  const slotsUntilJitoLeader = nextJitoLeaderSlot - currentSlot;

  return {
    currentLeader: VALIDATORS[currentLeaderIndex] || "Jito Validator",
    nextLeader: VALIDATORS[(currentLeaderIndex + 1) % VALIDATORS.length] || "SolNode-2",
    nextJitoLeader: "Laine (Jito)",
    nextJitoLeaderSlot,
    slotsUntilJitoLeader
  };
}
