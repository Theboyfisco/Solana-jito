import { streamBus } from '../stream/stream';

// Simulated current slot (would normally be maintained by Yellowstone stream)
export let currentSlot = 312450000;

export interface LeaderContext {
  currentLeader: string;
  nextLeader: string;
  nextJitoLeader: string;
  nextJitoLeaderSlot: number;
  slotsUntilJitoLeader: number;
}

const VALIDATORS = [
  "Validator-A", "Validator-B (Jito)", "Validator-C", "Validator-D (Jito)",
  "SolanaCompass", "Laine (Jito)", "Validator-E", "Validator-F", "JitoSolo-4", "StakeHaus (Jito)"
];

const windowSize = 12;

export function initLeaderService() {
  streamBus.on('slot', (data: any) => {
    // In live mode, data is the slot number. In mock, it's an object with slot.
    const slot = typeof data === 'object' ? data.slot : data;
    currentSlot = slot;
    
    const context = getLeaderContext();
    if (context.slotsUntilJitoLeader <= 5) {
      streamBus.emit('jitoLeaderApproaching', context);
    }
  });
}

export function getLeaderContext(): LeaderContext {
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
