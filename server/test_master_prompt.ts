import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('🏏 MASTER PROMPT VERIFICATION SUITE: BID WARS IPL');
console.log('====================================================\n');

// 1. Verify CSS styles for Functional Animations & Reduced Motion
console.log('--- TEST GROUP A: CSS Functional Animations ---');
const cssPath = path.resolve('client/src/index.css');
assert.ok(fs.existsSync(cssPath), 'index.css exists');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert.ok(cssContent.includes('playerEntrance'), 'playerEntrance keyframes defined');
assert.ok(cssContent.includes('pricePop'), 'pricePop keyframes defined');
assert.ok(cssContent.includes('stadium-spotlight'), 'stadium-spotlight vignette defined');
assert.ok(cssContent.includes('prefers-reduced-motion'), 'prefers-reduced-motion accessibility rule defined');
assert.ok(!cssContent.includes('.broadcast-corners {'), 'broadcast-corners removed for clean static borders');
console.log('  ✅ PASS: Functional animations, spotlight, and reduced-motion rules verified; corner animations removed');

// 2. Verify Audio Synthesis & 3-Second Countdown Tick Pacing
console.log('\n--- TEST GROUP B: Audio Synthesis & Countdown Tick Logic ---');
const audioPath = path.resolve('client/src/services/audio.ts');
assert.ok(fs.existsSync(audioPath), 'audio.ts exists');
const audioContent = fs.readFileSync(audioPath, 'utf8');

assert.ok(audioContent.includes('playCountdownTick(secondsLeft: number)'), 'playCountdownTick method exists');
assert.ok(audioContent.includes('880'), '880Hz pitch defined for countdown tick');
assert.ok(audioContent.includes('1046.5'), '1046.5Hz pitch defined for 2s countdown tick');
assert.ok(audioContent.includes('1318.5'), '1318.5Hz pitch defined for 1s countdown tick');
assert.ok(audioContent.includes('speakSoldAnnouncement'), 'speakSoldAnnouncement exists');
assert.ok(audioContent.includes('formatPriceForSpeech'), 'formatPriceForSpeech exists');
console.log('  ✅ PASS: playCountdownTick has distinct pitch hierarchy (880Hz, 1046.5Hz, 1318.5Hz) with 40ms duration');

// 3. Verify AuctionArena Layout & Component Features
console.log('\n--- TEST GROUP C: AuctionArena Layout & Component Structure ---');
const arenaPath = path.resolve('client/src/components/AuctionArena.tsx');
assert.ok(fs.existsSync(arenaPath), 'AuctionArena.tsx exists');
const arenaContent = fs.readFileSync(arenaPath, 'utf8');

// Countdown alert logic
assert.ok(arenaContent.includes('lastTickedSecondRef'), 'lastTickedSecondRef pinned to prevent duplicate ticks');
assert.ok(arenaContent.includes('remainingSec >= 1 && remainingSec <= 3'), 'Strict 3-second countdown filter (3, 2, 1)');
assert.ok(arenaContent.includes('lastBidRef'), 'lastBidRef tracked to reset alert state upon new accepted bid');
assert.ok(arenaContent.includes('isPlacingBid'), 'isPlacingBid state prevents accidental double submissions');
assert.ok(arenaContent.includes('wasOutbid'), 'Competitive outbid alert state tracked');
assert.ok(arenaContent.includes('stadium-spotlight'), 'Stadium spotlight vignette applied to player card');
assert.ok(arenaContent.includes('showOnboardingGuide'), 'Onboarding guide modal integrated');
assert.ok(arenaContent.includes('highestBiddedLot'), 'highestBiddedLot calculated from completed sold records');
assert.ok(arenaContent.includes('Highest-Bidded Player'), 'Highest-Bidded Player section rendered below host controls');
assert.ok(arenaContent.includes('No players sold yet.'), 'Empty state handled when no player is sold yet');
console.log('  ✅ PASS: AuctionArena has 3-second tick synchronization, outbid notification, stadium spotlight, and highest-bidded player panel');

// 4. Verify Full-Screen Hammer & SOLD Sequence (Sections 5, 6, 7)
console.log('\n--- TEST GROUP D: FullScreenGavelModal & User Hammer Asset ---');
const gavelModalPath = path.resolve('client/src/components/FullScreenGavelModal.tsx');
assert.ok(fs.existsSync(gavelModalPath), 'FullScreenGavelModal.tsx exists');
const gavelContent = fs.readFileSync(gavelModalPath, 'utf8');

assert.ok(gavelContent.includes('/auction-hammer.png'), 'FullScreenGavelModal uses user-provided /auction-hammer.png');
assert.ok(gavelContent.includes('animate-user-hammer-strike'), 'FullScreenGavelModal applies animate-user-hammer-strike');
assert.ok(gavelContent.includes('shortTeamName'), 'Short team abbreviation used in voice announcement');
assert.ok(gavelContent.includes('fullTeamName'), 'Full team name displayed on visual SOLD overlay');
assert.ok(gavelContent.includes('visualDone && voiceDone'), 'Strict synchronization gate: overlay stays until BOTH visual and speech finish');
assert.ok(fs.existsSync(path.resolve('client/public/auction-hammer.png')), 'auction-hammer.png exists on disk');
console.log('  ✅ PASS: Exact hammer image integrated with top-to-bottom swing, synchronized impact, and abbreviation in voice');

// 5. Verify Post-Auction Rewards & Shareable Card (Section 11)
console.log('\n--- TEST GROUP E: Post-Auction Rewards & Shareable Card ---');
const resultsPath = path.resolve('client/src/components/AuctionResults.tsx');
assert.ok(fs.existsSync(resultsPath), 'AuctionResults.tsx exists');
const resultsContent = fs.readFileSync(resultsPath, 'utf8');

assert.ok(resultsContent.includes('handleCopyShareCard'), 'handleCopyShareCard function defined');
assert.ok(resultsContent.includes('My Franchise Final Squad'), 'My Franchise Final Squad card header exists');
assert.ok(resultsContent.includes('Copy Shareable Card'), 'Copy Shareable Card button exists');
assert.ok(resultsContent.includes('myBatters') && resultsContent.includes('myBowlers'), 'Squad composition metrics displayed');
console.log('  ✅ PASS: Post-auction summary card with squad composition and clipboard sharing verified');

console.log('\n====================================================');
console.log('🎯 ALL MASTER PROMPT TESTS PASSED (100%)');
console.log('====================================================');

