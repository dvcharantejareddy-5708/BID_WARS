import { IPLTeamId, Player, RoomMember, BotStrategy, RoomSettings } from './types.js';

export interface BotDecision {
  shouldBid: boolean;
  maxWillingToPay: number;
  delayMs: number;
}

export function evaluateBotBid(
  botMember: RoomMember,
  teamId: IPLTeamId,
  player: Player,
  currentBid: number,
  currentBidder: IPLTeamId | null,
  squad: Player[],
  remainingPurse: number,
  settings: RoomSettings
): BotDecision {
  // 1. Don't bid against self
  if (currentBidder === teamId) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }

  // 2. Squad limits
  if (squad.length >= settings.maxSquad) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }

  // 3. Overseas limits
  const currentOverseas = squad.filter(p => p.is_overseas).length;
  if (player.is_overseas && currentOverseas >= settings.maxOverseas) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }

  // Next bid requirement
  const nextBid = currentBid === 0 ? player.base_price_inr : currentBid + settings.minBidIncrement;

  // 4. Mathematical squad feasibility check
  const slotsRemainingNeeded = Math.max(0, settings.minSquad - (squad.length + 1));
  const minReserveRequired = slotsRemainingNeeded * 3000000; // 30L per slot
  if ((remainingPurse - nextBid) < minReserveRequired) {
    return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
  }

  // 5. Strategy-based valuation
  const strategy = botMember.botStrategy || 'balanced';
  const basePrice = player.base_price_inr;
  let multiplier = 1.2;

  // Role inventory
  const batters = squad.filter(p => p.primary_role === 'BATTER' && !p.is_wicketkeeper).length;
  const bowlers = squad.filter(p => p.primary_role === 'BOWLER').length;
  const allRounders = squad.filter(p => p.primary_role === 'ALL_ROUNDER').length;
  const wks = squad.filter(p => p.is_wicketkeeper).length;

  let needFactor = 1.0;
  if (player.is_wicketkeeper) {
    needFactor = wks < 2 ? 1.6 : (wks < 3 ? 1.1 : 0.6);
  } else if (player.primary_role === 'BATTER') {
    needFactor = batters < 5 ? 1.5 : (batters < 7 ? 1.2 : 0.7);
  } else if (player.primary_role === 'BOWLER') {
    needFactor = bowlers < 5 ? 1.5 : (bowlers < 7 ? 1.2 : 0.7);
  } else if (player.primary_role === 'ALL_ROUNDER') {
    needFactor = allRounders < 3 ? 1.6 : (allRounders < 5 ? 1.2 : 0.8);
  }

  // Star / Marquee / Base price factor
  const marqueeBonus = player.is_marquee ? 1.8 : (basePrice >= 20000000 ? 1.4 : 1.0);

  switch (strategy) {
    case 'aggressive':
      multiplier = 2.8 * marqueeBonus * needFactor;
      break;
    case 'balanced':
      multiplier = 1.9 * marqueeBonus * needFactor;
      break;
    case 'budget':
      multiplier = player.is_marquee ? 1.4 : (1.3 * needFactor);
      break;
    case 'specialist':
      // Higher interest in all-rounders and premium bowlers
      if (player.primary_role === 'ALL_ROUNDER' || (player.primary_role === 'BOWLER' && basePrice >= 15000000)) {
        multiplier = 2.6 * marqueeBonus;
      } else {
        multiplier = 1.4 * needFactor;
      }
      break;
  }

  // Add slight random jitter (+/- 15%) so bots are not completely mechanical
  const jitter = 0.85 + Math.random() * 0.3;
  let maxWilling = Math.floor(basePrice * multiplier * jitter);

  // Ceiling bounded by remaining purse minus reserve
  const absoluteMaxPossible = remainingPurse - minReserveRequired;
  maxWilling = Math.min(maxWilling, absoluteMaxPossible);

  // Also don't spend more than 35% of remaining purse on a single player unless marquee
  if (!player.is_marquee && maxWilling > remainingPurse * 0.35) {
    maxWilling = Math.floor(remainingPurse * 0.35);
  }

  if (nextBid <= maxWilling) {
    // Human-like bidding delay: between 1200ms and 3600ms
    const delayMs = Math.floor(1200 + Math.random() * 2400);
    return { shouldBid: true, maxWillingToPay: maxWilling, delayMs };
  }

  return { shouldBid: false, maxWillingToPay: 0, delayMs: 0 };
}
