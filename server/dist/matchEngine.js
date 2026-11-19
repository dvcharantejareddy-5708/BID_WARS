export const LEGAL_CHOICES = [0, 1, 2, 3, 4, 6];
/**
 * Bowling Limits explicitly per tournament match overs:
 * 1 Over: 1 max
 * 2 Overs: 1 max
 * 5 Overs: 1 max
 * 10 Overs: 2 max
 * 15 Overs: 3 max
 * 20 Overs: 4 max
 */
export function getMaxBowlerOvers(matchOvers) {
    if (matchOvers <= 1)
        return 1;
    if (matchOvers <= 2)
        return 1;
    if (matchOvers <= 5)
        return 1;
    if (matchOvers <= 10)
        return 2;
    if (matchOvers <= 15)
        return 3;
    return 4; // 20 overs
}
export class MatchEngine {
    /**
     * Initializes a new live match from fixture and confirmed lineups
     */
    static createMatch(fixtureId, tournamentId, homeFranchiseId, awayFranchiseId, matchOvers, homeLineup, awayLineup, playersMap) {
        const maxBowlerOvers = getMaxBowlerOvers(matchOvers);
        const match = {
            id: `MATCH-${fixtureId}`,
            tournamentId,
            fixtureId,
            homeFranchiseId,
            awayFranchiseId,
            matchOvers,
            maxBowlerOvers,
            status: 'TOSS_PENDING',
            tossCallerFranchiseId: homeFranchiseId,
            currentInnings: 1,
            innings1: this.initializeInnings(1, homeFranchiseId, awayFranchiseId, homeLineup, awayLineup, playersMap, maxBowlerOvers),
            lineups: {
                [homeFranchiseId]: homeLineup,
                [awayFranchiseId]: awayLineup
            },
            pendingInputs: {},
            impactPlayersUsed: {
                [homeFranchiseId]: false,
                [awayFranchiseId]: false
            },
            ballHistory: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        return match;
    }
    /**
     * Initialize innings state for batting & bowling lineups
     */
    static initializeInnings(inningsNumber, battingFranchiseId, bowlingFranchiseId, battingLineup, bowlingLineup, playersMap, maxBowlerOvers, targetRuns) {
        const battingOrder = [...battingLineup.playingXI];
        const activeBatterId = battingOrder[0];
        const nonStrikerId = battingOrder[1];
        const batters = {};
        for (const pid of battingOrder) {
            const p = playersMap.get(pid);
            batters[pid] = {
                playerId: pid,
                name: p?.name || `Player ${pid}`,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                isOut: false,
                ovr: p?.ovr || 75,
                isCaptain: pid === battingLineup.captainId,
                isViceCaptain: pid === battingLineup.viceCaptainId
            };
        }
        const bowlers = {};
        for (const pid of bowlingLineup.playingXI) {
            const p = playersMap.get(pid);
            bowlers[pid] = {
                playerId: pid,
                name: p?.name || `Player ${pid}`,
                overs: 0,
                balls: 0,
                maidens: 0,
                runs: 0,
                wickets: 0,
                ovr: p?.ovr || 75,
                maxOversAllowed: maxBowlerOvers,
                abilityUsedInCurrentOver: false
            };
        }
        // Default bowler is the 11th or 10th player (typically primary bowlers)
        const activeBowlerId = bowlingLineup.playingXI[bowlingLineup.playingXI.length - 1];
        return {
            inningsNumber,
            battingFranchiseId,
            bowlingFranchiseId,
            totalRuns: 0,
            totalWickets: 0,
            oversCompleted: 0,
            ballsInCurrentOver: 0,
            targetRuns,
            activeBatterId,
            nonStrikerId,
            activeBowlerId,
            batterAbilityUsedInCurrentOver: false,
            battingOrder,
            nextBatterIndex: 2,
            batters,
            bowlers,
            fallOfWickets: [],
            isCompleted: false
        };
    }
    /**
     * Interactive Toss: Caller selects HEADS or TAILS, outcome generated randomly,
     * winner announced, and transitions to TOSS_DECISION_PENDING.
     */
    static resolveToss(match, callerFranchiseId, call) {
        if (match.status !== 'TOSS' && match.status !== 'TOSS_PENDING') {
            return { success: false, message: 'Toss is already completed or not active' };
        }
        if (callerFranchiseId !== match.homeFranchiseId && callerFranchiseId !== match.awayFranchiseId) {
            return { success: false, message: 'Invalid toss caller team' };
        }
        const tossResult = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        const isWinner = call === tossResult;
        const opponentFranchiseId = callerFranchiseId === match.homeFranchiseId ? match.awayFranchiseId : match.homeFranchiseId;
        const tossWinnerFranchiseId = isWinner ? callerFranchiseId : opponentFranchiseId;
        const tossLoserFranchiseId = isWinner ? opponentFranchiseId : callerFranchiseId;
        match.tossCallerFranchiseId = callerFranchiseId;
        match.tossCall = call;
        match.tossResult = tossResult;
        match.tossWinnerFranchiseId = tossWinnerFranchiseId;
        match.tossLoserFranchiseId = tossLoserFranchiseId;
        match.status = 'TOSS_DECISION_PENDING';
        match.selectionDeadline = Date.now() + 15000;
        match.updatedAt = Date.now();
        // Explicit snake_case fields required by specification
        match.toss_winner_team_id = tossWinnerFranchiseId;
        match.toss_loser_team_id = tossLoserFranchiseId;
        match.toss_choice = call;
        match.current_match_phase = match.status;
        return {
            success: true,
            tossWinnerFranchiseId,
            tossResult,
            message: `${tossWinnerFranchiseId} won the toss (${tossResult} landed, call was ${call})!`
        };
    }
    /**
     * Toss Decision: Toss winner decides to BAT or BOWL first.
     * Transitions match to OPENING_PLAYER_SELECTION with a 5-second selection timer.
     */
    static handleTossDecision(match, tossWinnerFranchiseId, decision, playersMap) {
        if (match.status !== 'TOSS_DECISION_PENDING' && match.status !== 'TOSS' && match.status !== 'TOSS_PENDING') {
            return { success: false, message: 'Match is not awaiting a toss decision' };
        }
        if (match.tossWinnerFranchiseId && match.tossWinnerFranchiseId !== tossWinnerFranchiseId) {
            return { success: false, message: `Only the toss winning team (${match.tossWinnerFranchiseId}) can choose Bat/Bowl` };
        }
        match.tossWinnerFranchiseId = tossWinnerFranchiseId;
        const opponentFranchiseId = tossWinnerFranchiseId === match.homeFranchiseId ? match.awayFranchiseId : match.homeFranchiseId;
        match.tossLoserFranchiseId = opponentFranchiseId;
        match.tossDecision = decision;
        const battingFirst = decision === 'BAT'
            ? tossWinnerFranchiseId
            : opponentFranchiseId;
        const bowlingFirst = battingFirst === match.homeFranchiseId ? match.awayFranchiseId : match.homeFranchiseId;
        match.innings1 = this.initializeInnings(1, battingFirst, bowlingFirst, match.lineups[battingFirst], match.lineups[bowlingFirst], playersMap, match.maxBowlerOvers);
        match.status = 'OPENING_BATTERS_SELECTION';
        match.currentInnings = 1;
        // Strict 5-second selection timer as specified in Part 2 and Part 3
        match.selectionDeadline = Date.now() + 5000;
        match.openingSelections = {
            battingConfirmed: false,
            bowlingConfirmed: false
        };
        match.updatedAt = Date.now();
        // Explicit snake_case fields required by specification
        match.toss_winner_team_id = tossWinnerFranchiseId;
        match.toss_loser_team_id = match.tossLoserFranchiseId;
        match.toss_choice = decision;
        match.batting_team_id = battingFirst;
        match.bowling_team_id = bowlingFirst;
        match.current_match_phase = match.status;
        return {
            success: true,
            message: `${tossWinnerFranchiseId} chose to ${decision} first. Select opening players.`
        };
    }
    /**
     * Resolves the toss and determines who bats and bowls first (Legacy fallback)
     */
    static handleToss(match, tossWinnerFranchiseId, decision, playersMap) {
        this.handleTossDecision(match, tossWinnerFranchiseId, decision, playersMap);
    }
    /**
     * Batting team selects opening 2 batters (Striker & Non-Striker) from confirmed Playing XI.
     */
    static selectOpeningBatters(match, franchiseId, strikerId, nonStrikerId) {
        const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!inn)
            return { success: false, message: 'Invalid innings' };
        if (match.status !== 'OPENING_PLAYER_SELECTION' &&
            match.status !== 'OPENING_BATTERS_SELECTION') {
            return { success: false, message: 'Match is not in opening batters selection phase' };
        }
        if (franchiseId !== inn.battingFranchiseId) {
            return { success: false, message: 'Only batting team can select opening batters' };
        }
        if (!strikerId || !nonStrikerId || strikerId === nonStrikerId) {
            return { success: false, message: 'Striker and Non-Striker must be two distinct players' };
        }
        const lineup = match.lineups[franchiseId]?.playingXI || [];
        if (!lineup.includes(strikerId) || !lineup.includes(nonStrikerId)) {
            return { success: false, message: 'Both openers must be in the confirmed Playing XI' };
        }
        inn.activeBatterId = strikerId;
        inn.nonStrikerId = nonStrikerId;
        // Rearrange batting order: striker at 0, nonStriker at 1, rest preserved
        const remaining = lineup.filter(pid => pid !== strikerId && pid !== nonStrikerId);
        inn.battingOrder = [strikerId, nonStrikerId, ...remaining];
        inn.nextBatterIndex = 2;
        if (!match.openingSelections) {
            match.openingSelections = {};
        }
        match.openingSelections.battingConfirmed = true;
        // If bowling selection is also confirmed, transition to DELIVERY_ACTIVE
        const isBowlingConfirmed = Boolean(match.openingSelections.bowlingConfirmed);
        if (isBowlingConfirmed) {
            match.status = 'DELIVERY_ACTIVE';
            this.startTurnTimer(match);
            match.selectionDeadline = undefined;
        }
        else {
            // In sequential mode, transition to OPENING_BOWLER_SELECTION with 5s timer
            if (match.status === 'OPENING_BATTERS_SELECTION') {
                match.status = 'OPENING_BOWLER_SELECTION';
                match.selectionDeadline = Date.now() + 5000;
            }
        }
        match.updatedAt = Date.now();
        match.current_match_phase = match.status;
        return { success: true, message: 'Opening batters confirmed.' };
    }
    /**
     * Bowling team selects opening bowler from confirmed Playing XI.
     */
    static selectOpeningBowler(match, franchiseId, bowlerId) {
        const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!inn)
            return { success: false, message: 'Invalid innings' };
        if (match.status !== 'OPENING_PLAYER_SELECTION' &&
            match.status !== 'OPENING_BOWLER_SELECTION') {
            return { success: false, message: 'Match is not in opening bowler selection phase' };
        }
        if (franchiseId !== inn.bowlingFranchiseId) {
            return { success: false, message: 'Only bowling team can select opening bowler' };
        }
        const lineup = match.lineups[franchiseId]?.playingXI || [];
        if (!lineup.includes(bowlerId)) {
            return { success: false, message: 'Selected bowler must be in the confirmed Playing XI' };
        }
        inn.activeBowlerId = bowlerId;
        if (!match.openingSelections) {
            match.openingSelections = {};
        }
        match.openingSelections.bowlingConfirmed = true;
        // If batting selection is also confirmed, transition to DELIVERY_ACTIVE
        const isBattingConfirmed = Boolean(match.openingSelections.battingConfirmed);
        if (isBattingConfirmed) {
            match.status = 'DELIVERY_ACTIVE';
            this.startTurnTimer(match);
            match.selectionDeadline = undefined;
        }
        match.updatedAt = Date.now();
        match.current_match_phase = match.status;
        return { success: true, message: 'Opening bowler confirmed.' };
    }
    /**
     * Batting team selects replacement batter after a wicket fell.
     * Transitions from BATTER_SELECTION back to DELIVERY_ACTIVE.
     */
    static selectReplacementBatter(match, franchiseId, replacementBatterId) {
        const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!inn)
            return { success: false, message: 'Invalid innings' };
        if (match.status !== 'BATTER_SELECTION') {
            return { success: false, message: 'Match is not currently waiting for a batter replacement' };
        }
        if (franchiseId !== inn.battingFranchiseId) {
            return { success: false, message: 'Only batting team can select replacement batter' };
        }
        const lineup = match.lineups[franchiseId]?.playingXI || [];
        if (!lineup.includes(replacementBatterId)) {
            return { success: false, message: 'Selected batter must be in the confirmed Playing XI' };
        }
        if (replacementBatterId === inn.nonStrikerId) {
            return { success: false, message: 'Player is already batting at the non-striker end' };
        }
        const batterFig = inn.batters[replacementBatterId];
        if (batterFig?.isOut) {
            return { success: false, message: 'Dismissed batter cannot re-enter to bat' };
        }
        inn.activeBatterId = replacementBatterId;
        match.status = 'DELIVERY_ACTIVE';
        this.startTurnTimer(match);
        match.updatedAt = Date.now();
        return { success: true, message: `${batterFig?.name || replacementBatterId} has taken strike!` };
    }
    /**
     * Selects the active bowler for the upcoming over
     */
    static selectBowler(match, bowlerId) {
        const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!innings)
            return { success: false, message: 'Invalid innings state' };
        if (innings.ballsInCurrentOver > 0) {
            return { success: false, message: 'Cannot change bowler in the middle of an over' };
        }
        const bowlerFig = innings.bowlers[bowlerId];
        if (!bowlerFig)
            return { success: false, message: 'Player is not in the bowling lineup' };
        if (bowlerFig.overs >= bowlerFig.maxOversAllowed) {
            return { success: false, message: `Bowler has already bowled their quota of ${bowlerFig.maxOversAllowed} overs` };
        }
        if (innings.oversCompleted > 0 && innings.previousOverBowlerId === bowlerId) {
            // Check if team has other bowlers who can bowl
            const otherEligible = Object.values(innings.bowlers).some(b => b.playerId !== bowlerId && b.overs < b.maxOversAllowed);
            if (otherEligible) {
                return { success: false, message: 'Bowler cannot bowl two consecutive overs' };
            }
        }
        innings.activeBowlerId = bowlerId;
        bowlerFig.abilityUsedInCurrentOver = false;
        match.status = 'DELIVERY_ACTIVE';
        this.startTurnTimer(match);
        match.updatedAt = Date.now();
        return { success: true, message: 'Bowler selected successfully' };
    }
    /**
     * Starts or resets the 10-second synchronized turn timer and authoritative delivery state
     */
    static startTurnTimer(match) {
        const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
        const overNumber = inn ? inn.oversCompleted : 0;
        const ballNumber = inn ? (inn.ballsInCurrentOver + 1) : 1;
        const now = Date.now();
        const deadline = now + 10000;
        const deliveryId = `DEL-${match.id}-${match.currentInnings}-${overNumber}-${ballNumber}-${now}`;
        match.currentDelivery = {
            id: deliveryId,
            matchId: match.id,
            inningsNumber: match.currentInnings,
            overNumber,
            ballNumber,
            startTime: now,
            deadline,
            status: 'WAITING_INPUTS'
        };
        match.pendingInputs = {
            turnStartTime: now,
            turnExpiresAt: deadline,
            batterChoice: undefined,
            bowlerChoice: undefined,
            batterAbility: undefined,
            bowlerAbility: undefined,
            blockedNumbers: undefined,
            hasBatterSubmitted: false,
            hasBowlerSubmitted: false
        };
    }
    /**
     * Check available abilities for the current batter & bowler matchup
     */
    static getMatchupAbilities(match, playersMap) {
        const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!innings)
            return { batterAbilities: [], bowlerAbilities: [], batterOvr: 75, bowlerOvr: 75, diff: 0 };
        const batter = innings.batters[innings.activeBatterId];
        const bowler = innings.bowlers[innings.activeBowlerId];
        const batterOvr = batter?.ovr || 75;
        const bowlerOvr = bowler?.ovr || 75;
        const diff = bowlerOvr - batterOvr; // Positive means bowler is higher, negative means batter is higher
        const bowlerAbilities = [];
        const batterAbilities = [];
        // Bowler check
        if (!bowler?.abilityUsedInCurrentOver) {
            if (diff >= 8) {
                bowlerAbilities.push('ELITE_NUMBER_BLOCK');
            }
            else if (diff >= 3) {
                bowlerAbilities.push('NUMBER_BLOCK');
            }
        }
        // Batter check: diff is bowler - batter, so batter - bowler = -diff
        const batterAdv = batterOvr - bowlerOvr;
        if (!innings.batterAbilityUsedInCurrentOver) {
            if (batterAdv >= 8) {
                batterAbilities.push('SECRET_DOUBLE_SHOT');
            }
            else if (batterAdv >= 3) {
                batterAbilities.push('COMBINATION_SHOT');
            }
        }
        return { batterAbilities, bowlerAbilities, batterOvr, bowlerOvr, diff };
    }
    /**
     * Registers input from either batter or bowler
     */
    static submitChoice(match, franchiseId, choice, ability, blockedNumbers, playersMap) {
        const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!innings || innings.isCompleted || match.status === 'COMPLETED') {
            return { resolved: false, error: 'Match is not in an active ball state' };
        }
        const isBattingTeam = franchiseId === innings.battingFranchiseId;
        const isBowlingTeam = franchiseId === innings.bowlingFranchiseId;
        if (!isBattingTeam && !isBowlingTeam) {
            return { resolved: false, error: 'Team is not part of this match' };
        }
        const batter = innings.batters[innings.activeBatterId];
        const bowler = innings.bowlers[innings.activeBowlerId];
        const batterOvr = batter?.ovr || 75;
        const bowlerOvr = bowler?.ovr || 75;
        const bowlerAdv = bowlerOvr - batterOvr;
        const batterAdv = batterOvr - bowlerOvr;
        // Validate bowler ability & blocked numbers
        if (isBowlingTeam) {
            if (match.pendingInputs.bowlerChoice !== undefined) {
                return { resolved: false, error: 'Bowler choice already submitted and locked for this delivery.' };
            }
            if (!LEGAL_CHOICES.includes(choice)) {
                return { resolved: false, error: 'Invalid delivery choice' };
            }
            if (ability === 'NUMBER_BLOCK' || ability === 'ELITE_NUMBER_BLOCK') {
                const bowlerFig = innings.bowlers[innings.activeBowlerId];
                if (!bowlerFig || bowlerFig.abilityUsedInCurrentOver) {
                    return { resolved: false, error: 'Bowler special ability already used in current over' };
                }
                if (ability === 'ELITE_NUMBER_BLOCK') {
                    if (bowlerAdv < 8) {
                        return { resolved: false, error: 'Special Delivery requires at least 8 OVR advantage' };
                    }
                }
                else if (ability === 'NUMBER_BLOCK') {
                    if (bowlerAdv < 3) {
                        return { resolved: false, error: 'Number Block requires 3–7 OVR advantage' };
                    }
                    if (!blockedNumbers ||
                        blockedNumbers.length !== 3 ||
                        new Set(blockedNumbers).size !== 3 ||
                        !blockedNumbers.every(n => LEGAL_CHOICES.includes(n))) {
                        return { resolved: false, error: 'Bowler must select exactly 3 unique scoring options to block from [0, 1, 2, 3, 4, 6]' };
                    }
                }
            }
            match.pendingInputs.bowlerChoice = choice;
            match.pendingInputs.hasBowlerSubmitted = true;
            if (ability === 'ELITE_NUMBER_BLOCK') {
                match.pendingInputs.bowlerAbility = 'ELITE_NUMBER_BLOCK';
                match.pendingInputs.blockedNumbers = [0, 1, 2, 3]; // Batter can only select 4 or 6!
            }
            else if (ability === 'NUMBER_BLOCK' && blockedNumbers) {
                match.pendingInputs.bowlerAbility = 'NUMBER_BLOCK';
                match.pendingInputs.blockedNumbers = blockedNumbers;
            }
        }
        // Validate batter input and choice
        if (isBattingTeam) {
            if (match.pendingInputs.batterChoice !== undefined) {
                return { resolved: false, error: 'Batter choice already submitted and locked for this delivery.' };
            }
            if (!LEGAL_CHOICES.includes(choice)) {
                return { resolved: false, error: 'Invalid scoring choice' };
            }
            // Check if choice is restricted by an active bowler block
            if (match.pendingInputs.bowlerAbility === 'ELITE_NUMBER_BLOCK' && (choice === 0 || choice === 1 || choice === 2 || choice === 3)) {
                return { resolved: false, error: 'Special Delivery active! You can only select 4 or 6.' };
            }
            if (match.pendingInputs.blockedNumbers && match.pendingInputs.blockedNumbers.includes(choice)) {
                return { resolved: false, error: `Selection ${choice} is blocked by bowler's special ability!` };
            }
            if (ability === 'COMBINATION_SHOT' || ability === 'SECRET_DOUBLE_SHOT') {
                if (innings.batterAbilityUsedInCurrentOver) {
                    return { resolved: false, error: 'Batter special ability already used in current over' };
                }
                if (ability === 'SECRET_DOUBLE_SHOT') {
                    if (batterAdv < 8) {
                        return { resolved: false, error: '2X Power requires at least 8 OVR advantage' };
                    }
                }
                else if (ability === 'COMBINATION_SHOT') {
                    if (batterAdv < 3) {
                        return { resolved: false, error: 'Bonus Shot requires 3–7 OVR advantage' };
                    }
                }
            }
            match.pendingInputs.batterChoice = choice;
            match.pendingInputs.hasBatterSubmitted = true;
            if (ability === 'SECRET_DOUBLE_SHOT') {
                match.pendingInputs.batterAbility = 'SECRET_DOUBLE_SHOT';
            }
            else if (ability === 'COMBINATION_SHOT') {
                match.pendingInputs.batterAbility = 'COMBINATION_SHOT';
            }
        }
        // Check if both sides have submitted
        if (match.pendingInputs.batterChoice !== undefined && match.pendingInputs.bowlerChoice !== undefined) {
            const event = this.resolveBall(match, playersMap);
            return { resolved: true, ballEvent: event };
        }
        return { resolved: false };
    }
    /**
     * Resolves a turn or selection on timeout:
     * - In BATTER_SELECTION: auto-picks next available batter
     * - In BOWLER_SELECTION: auto-picks next eligible bowler
     * - In OPENING_BATTERS_SELECTION: auto-picks default top 2 batters
     * - In OPENING_BOWLER_SELECTION: auto-picks default bowler
     * - In active delivery:
     *   Batter timeout = OUT (Timed Out)
     *   Bowler timeout = random legal choice
     */
    static handleTimeout(match, playersMap) {
        const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (!innings || innings.isCompleted || match.status === 'COMPLETED')
            return null;
        if (match.status === 'OPENING_PLAYER_SELECTION' ||
            match.status === 'OPENING_BATTERS_SELECTION' ||
            match.status === 'OPENING_BOWLER_SELECTION') {
            const battingLineup = match.lineups[innings.battingFranchiseId]?.playingXI || [];
            const bowlingLineup = match.lineups[innings.bowlingFranchiseId]?.playingXI || [];
            if (!innings.activeBatterId || !innings.nonStrikerId || innings.activeBatterId === innings.nonStrikerId) {
                const sId = battingLineup[0] || '';
                const nsId = battingLineup[1] || '';
                this.selectOpeningBatters(match, innings.battingFranchiseId, sId, nsId);
            }
            if (!innings.activeBowlerId) {
                const bId = bowlingLineup[bowlingLineup.length - 1] || bowlingLineup[0] || '';
                this.selectOpeningBowler(match, innings.bowlingFranchiseId, bId);
            }
            return null;
        }
        if (match.status === 'BATTER_SELECTION') {
            const eligible = innings.battingOrder.find(pid => !innings.batters[pid]?.isOut && pid !== innings.nonStrikerId);
            if (eligible) {
                this.selectReplacementBatter(match, innings.battingFranchiseId, eligible);
            }
            else {
                innings.isCompleted = true;
                if (innings.inningsNumber === 1) {
                    this.transitionToInnings2(match, playersMap);
                }
                else {
                    this.finalizeMatch(match);
                }
            }
            return null;
        }
        if (match.status === 'BOWLER_SELECTION') {
            const eligible = Object.values(innings.bowlers).find(b => b.playerId !== innings.previousOverBowlerId && b.overs < b.maxOversAllowed) || Object.values(innings.bowlers).find(b => b.overs < b.maxOversAllowed);
            if (eligible) {
                this.selectBowler(match, eligible.playerId);
            }
            return null;
        }
        // Active delivery timeout handling
        // If bowler didn't submit, pick random legal choice
        if (match.pendingInputs.bowlerChoice === undefined) {
            const randIdx = Math.floor(Math.random() * LEGAL_CHOICES.length);
            match.pendingInputs.bowlerChoice = LEGAL_CHOICES[randIdx];
        }
        // If batter didn't submit, batter is timed out!
        if (match.pendingInputs.batterChoice === undefined) {
            return this.resolveTimedOutBatter(match);
        }
        return this.resolveBall(match, playersMap);
    }
    /**
     * Resolves a timed-out dismissal for the active batter
     */
    static resolveTimedOutBatter(match) {
        const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
        const batter = innings.batters[innings.activeBatterId];
        const bowler = innings.bowlers[innings.activeBowlerId];
        batter.isOut = true;
        batter.dismissal = 'Timed Out (10s exceeded)';
        batter.balls += 1;
        innings.ballsInCurrentOver += 1;
        bowler.balls += 1;
        bowler.wickets += 1;
        innings.totalWickets += 1;
        const overStr = `${innings.oversCompleted}.${innings.ballsInCurrentOver}`;
        innings.fallOfWickets.push({
            wicket: innings.totalWickets,
            runs: innings.totalRuns,
            overStr,
            playerOutName: batter.name
        });
        const ballEvent = {
            id: `BALL-${match.id}-${innings.inningsNumber}-${innings.oversCompleted}-${innings.ballsInCurrentOver}-${Date.now()}`,
            matchId: match.id,
            tournamentId: match.tournamentId,
            innings: innings.inningsNumber,
            overNumber: innings.oversCompleted,
            ballNumber: innings.ballsInCurrentOver,
            batterId: batter.playerId,
            batterName: batter.name,
            batterOvr: batter.ovr,
            bowlerId: bowler.playerId,
            bowlerName: bowler.name,
            bowlerOvr: bowler.ovr,
            ovrDiff: bowler.ovr - batter.ovr,
            batterInput: 0,
            bowlerInput: match.pendingInputs.bowlerChoice || 0,
            isWicket: true,
            dismissalType: 'Timed Out',
            runsScored: 0,
            totalRunsAfter: innings.totalRuns,
            wicketsAfter: innings.totalWickets,
            commentary: `⏱️ TIMED OUT! ${batter.name} exceeded the 10-second decision window. Dismissed!`,
            timestamp: Date.now()
        };
        match.lastDeliveryResult = {
            ballNumber: innings.ballsInCurrentOver,
            overNumber: innings.oversCompleted,
            batterName: batter.name,
            bowlerName: bowler.name,
            batterInput: 0,
            bowlerInput: match.pendingInputs.bowlerChoice || 0,
            runsScored: 0,
            isWicket: true,
            commentary: ballEvent.commentary,
            timestamp: Date.now()
        };
        match.ballHistory.push(ballEvent);
        if (match.currentDelivery) {
            match.currentDelivery.status = 'RESOLVED';
            match.currentDelivery.resultStatus = 'TIMED_OUT';
        }
        this.postBallProcessing(match, innings, 0, true);
        return ballEvent;
    }
    /**
     * Resolves a ball delivery when both inputs are present
     */
    static resolveBall(match, playersMap) {
        const innings = match.currentInnings === 1 ? match.innings1 : match.innings2;
        const batter = innings.batters[innings.activeBatterId];
        const bowler = innings.bowlers[innings.activeBowlerId];
        const batterChoice = match.pendingInputs.batterChoice;
        const bowlerChoice = match.pendingInputs.bowlerChoice;
        const bowlerAbility = match.pendingInputs.bowlerAbility;
        const batterAbility = match.pendingInputs.batterAbility;
        const blockedNumbers = match.pendingInputs.blockedNumbers;
        if (bowlerAbility) {
            bowler.abilityUsedInCurrentOver = true;
        }
        if (batterAbility) {
            innings.batterAbilityUsedInCurrentOver = true;
        }
        const isWicket = batterChoice === bowlerChoice;
        let runsScored = 0;
        let commentary = '';
        if (isWicket) {
            batter.isOut = true;
            batter.dismissal = `c & b ${bowler.name}`;
            batter.balls += 1;
            bowler.wickets += 1;
            bowler.balls += 1;
            innings.ballsInCurrentOver += 1;
            innings.totalWickets += 1;
            commentary = `🚨 WICKET! Both selected [${batterChoice}]. ${batter.name} is OUT! Caught & bowled by ${bowler.name}.`;
            if (bowlerAbility) {
                commentary = `🔥 [${bowlerAbility}] SUCCESS! Both picked [${batterChoice}]. ${batter.name} is OUT!`;
            }
            const overStr = `${innings.oversCompleted}.${innings.ballsInCurrentOver}`;
            innings.fallOfWickets.push({
                wicket: innings.totalWickets,
                runs: innings.totalRuns,
                overStr,
                playerOutName: batter.name
            });
        }
        else {
            // Runs scored
            runsScored = batterChoice;
            // Handle Batter Abilities
            if (batterAbility === 'COMBINATION_SHOT') {
                runsScored = batterChoice + bowlerChoice;
                commentary = `⚡ COMBINATION SHOT! Batter picked [${batterChoice}], Bowler picked [${bowlerChoice}]. ${runsScored} runs scored!`;
            }
            else if (batterAbility === 'SECRET_DOUBLE_SHOT') {
                runsScored = batterChoice * 2;
                commentary = `💥 SECRET DOUBLE SHOT UNLEASHED! Batter [${batterChoice}] x 2 = ${runsScored} RUNS!`;
            }
            else {
                if (runsScored === 4) {
                    commentary = `🎯 FOUR! Beautifully timed drive for 4 runs. Batter [${batterChoice}] vs Bowler [${bowlerChoice}].`;
                }
                else if (runsScored === 6) {
                    commentary = `🚀 SIX! Clears the boundary rope! Massive 6 runs. Batter [${batterChoice}] vs Bowler [${bowlerChoice}].`;
                }
                else if (runsScored === 0) {
                    commentary = `🛡️ DOT BALL. Batter defended [0]. Bowler delivered [${bowlerChoice}].`;
                }
                else {
                    commentary = `🏃 ${runsScored} run(s) taken. Batter [${batterChoice}] vs Bowler [${bowlerChoice}].`;
                }
            }
            batter.runs += runsScored;
            batter.balls += 1;
            if (runsScored === 4)
                batter.fours += 1;
            if (runsScored === 6)
                batter.sixes += 1;
            bowler.runs += runsScored;
            bowler.balls += 1;
            innings.ballsInCurrentOver += 1;
            innings.totalRuns += runsScored;
        }
        const ballEvent = {
            id: `BALL-${match.id}-${innings.inningsNumber}-${innings.oversCompleted}-${innings.ballsInCurrentOver}-${Date.now()}`,
            matchId: match.id,
            tournamentId: match.tournamentId,
            innings: innings.inningsNumber,
            overNumber: innings.oversCompleted,
            ballNumber: innings.ballsInCurrentOver,
            batterId: batter.playerId,
            batterName: batter.name,
            batterOvr: batter.ovr,
            bowlerId: bowler.playerId,
            bowlerName: bowler.name,
            bowlerOvr: bowler.ovr,
            ovrDiff: bowler.ovr - batter.ovr,
            bowlerAbilityUsed: bowlerAbility,
            batterAbilityUsed: batterAbility,
            blockedNumbers,
            batterInput: batterChoice,
            bowlerInput: bowlerChoice,
            isWicket,
            dismissalType: isWicket ? 'Caught & Bowled' : undefined,
            runsScored,
            totalRunsAfter: innings.totalRuns,
            wicketsAfter: innings.totalWickets,
            commentary,
            timestamp: Date.now()
        };
        match.lastDeliveryResult = {
            ballNumber: innings.ballsInCurrentOver,
            overNumber: innings.oversCompleted,
            batterName: batter.name,
            bowlerName: bowler.name,
            batterInput: batterChoice,
            bowlerInput: bowlerChoice,
            runsScored,
            isWicket,
            commentary,
            timestamp: Date.now()
        };
        match.ballHistory.push(ballEvent);
        if (match.currentDelivery) {
            match.currentDelivery.status = 'RESOLVED';
            match.currentDelivery.resultStatus = isWicket
                ? 'WICKET'
                : runsScored === 6 || runsScored === 4
                    ? 'BOUNDARY'
                    : runsScored === 0
                        ? 'DOT'
                        : 'RUNS';
        }
        this.postBallProcessing(match, innings, runsScored, isWicket, playersMap);
        return ballEvent;
    }
    /**
     * Post-ball updates: strike rotation, over completion, innings completion, match target chase
     */
    static postBallProcessing(match, innings, runsScored, isWicket, playersMap) {
        const allOut = innings.totalWickets >= 10;
        const overFinished = innings.ballsInCurrentOver >= 6;
        // Check if target chased in Innings 2
        if (innings.inningsNumber === 2 && innings.targetRuns !== undefined) {
            if (innings.totalRuns >= innings.targetRuns) {
                innings.isCompleted = true;
                this.finalizeMatch(match);
                return;
            }
        }
        // Check if all out
        if (allOut) {
            innings.isCompleted = true;
            if (innings.inningsNumber === 1) {
                this.transitionToInnings2(match, playersMap);
            }
            else {
                this.finalizeMatch(match);
            }
            return;
        }
        // Check if over finished
        if (overFinished) {
            innings.oversCompleted += 1;
            innings.ballsInCurrentOver = 0;
            innings.batterAbilityUsedInCurrentOver = false;
            innings.previousOverBowlerId = innings.activeBowlerId;
            const bowler = innings.bowlers[innings.activeBowlerId];
            if (bowler) {
                bowler.overs += 1;
                bowler.balls = 0;
                bowler.abilityUsedInCurrentOver = false;
            }
            // Rotate strike at end of over
            if (innings.nonStrikerId) {
                const temp = innings.activeBatterId;
                innings.activeBatterId = innings.nonStrikerId;
                innings.nonStrikerId = temp;
            }
            // Check if innings overs finished
            if (innings.oversCompleted >= match.matchOvers) {
                innings.isCompleted = true;
                if (innings.inningsNumber === 1) {
                    this.transitionToInnings2(match, playersMap);
                }
                else {
                    this.finalizeMatch(match);
                }
                return;
            }
            // Over completed, waiting for bowling team to select next bowler (5s timer)
            match.status = 'BOWLER_SELECTION';
            match.selectionDeadline = Date.now() + 5000;
            match.updatedAt = Date.now();
            return;
        }
        // If wicket fell (and not all out and not over finished) -> BATTER_SELECTION (5s timer)
        if (isWicket) {
            match.status = 'BATTER_SELECTION';
            match.selectionDeadline = Date.now() + 5000;
            match.updatedAt = Date.now();
            return;
        }
        // Strike rotation on odd runs (if not out)
        if (runsScored === 1 || runsScored === 3) {
            if (innings.nonStrikerId) {
                const temp = innings.activeBatterId;
                innings.activeBatterId = innings.nonStrikerId;
                innings.nonStrikerId = temp;
            }
        }
        // Continue innings: restart 10s turn timer
        match.status = 'DELIVERY_ACTIVE';
        this.startTurnTimer(match);
        match.updatedAt = Date.now();
    }
    /**
     * Transition from 1st innings to 2nd innings
     */
    static transitionToInnings2(match, playersMap) {
        const inn1 = match.innings1;
        const targetRuns = inn1.totalRuns + 1;
        match.targetRuns = targetRuns;
        match.currentInnings = 2;
        const battingSecond = inn1.bowlingFranchiseId;
        const bowlingSecond = inn1.battingFranchiseId;
        const pMap = playersMap || new Map();
        match.innings2 = this.initializeInnings(2, battingSecond, bowlingSecond, match.lineups[battingSecond], match.lineups[bowlingSecond], pMap, match.maxBowlerOvers, targetRuns);
        match.openingSelections = {
            battingConfirmed: false,
            bowlingConfirmed: false
        };
        match.status = 'OPENING_BATTERS_SELECTION';
        match.selectionDeadline = Date.now() + 5000;
        match.updatedAt = Date.now();
        match.current_match_phase = match.status;
    }
    /**
     * Finalizes the match result and calculates MVP
     */
    static finalizeMatch(match) {
        match.status = 'COMPLETED';
        const inn1 = match.innings1;
        const inn2 = match.innings2;
        if (!inn2) {
            match.winnerFranchiseId = inn1.battingFranchiseId;
            match.resultSummary = `${inn1.battingFranchiseId} declared winner.`;
            match.updatedAt = Date.now();
            return;
        }
        const team1 = inn1.battingFranchiseId;
        const team2 = inn2.battingFranchiseId;
        if (inn2.totalRuns >= inn2.targetRuns) {
            const wicketsRemaining = 10 - inn2.totalWickets;
            match.winnerFranchiseId = team2;
            match.resultSummary = `${team2} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}!`;
        }
        else if (inn2.totalRuns === inn1.totalRuns) {
            // Tie! Boundary count tie-break
            const team1Boundaries = Object.values(inn1.batters).reduce((sum, b) => sum + b.fours + b.sixes, 0);
            const team2Boundaries = Object.values(inn2.batters).reduce((sum, b) => sum + b.fours + b.sixes, 0);
            if (team2Boundaries > team1Boundaries) {
                match.winnerFranchiseId = team2;
                match.resultSummary = `Match TIED! ${team2} won on boundary count (${team2Boundaries} vs ${team1Boundaries})!`;
            }
            else if (team1Boundaries > team2Boundaries) {
                match.winnerFranchiseId = team1;
                match.resultSummary = `Match TIED! ${team1} won on boundary count (${team1Boundaries} vs ${team2Boundaries})!`;
            }
            else {
                match.winnerFranchiseId = team1;
                match.resultSummary = `Match TIED! Level on runs and boundaries.`;
            }
        }
        else {
            const runMargin = inn1.totalRuns - inn2.totalRuns;
            match.winnerFranchiseId = team1;
            match.resultSummary = `${team1} won by ${runMargin} run${runMargin === 1 ? '' : 's'}!`;
        }
        // Calculate MVP
        let bestMvpPoints = -1;
        let mvpPlayerId;
        const evaluatePoints = (batters, bowlers) => {
            for (const b of Object.values(batters)) {
                const pts = b.runs * 1 + b.fours * 1 + b.sixes * 2;
                if (pts > bestMvpPoints) {
                    bestMvpPoints = pts;
                    mvpPlayerId = b.playerId;
                }
            }
            for (const b of Object.values(bowlers)) {
                const pts = b.wickets * 25 + b.maidens * 10;
                if (pts > bestMvpPoints) {
                    bestMvpPoints = pts;
                    mvpPlayerId = b.playerId;
                }
            }
        };
        evaluatePoints(inn1.batters, inn1.bowlers);
        evaluatePoints(inn2.batters, inn2.bowlers);
        match.mvpPlayerId = mvpPlayerId;
        match.updatedAt = Date.now();
    }
    /**
     * Allows a team to substitute an Impact Player
     */
    static substituteImpactPlayer(match, franchiseId, playerOutId, playerIn) {
        if (match.impactPlayersUsed[franchiseId]) {
            return { success: false, message: 'Impact player already used for this team' };
        }
        const lineup = match.lineups[franchiseId];
        if (!lineup)
            return { success: false, message: 'Lineup not found' };
        const idx = lineup.playingXI.indexOf(playerOutId);
        if (idx === -1)
            return { success: false, message: 'Player out is not in Playing XI' };
        lineup.playingXI[idx] = playerIn.id;
        match.impactPlayersUsed[franchiseId] = true;
        // Update active innings records if applicable
        const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
        if (inn) {
            if (inn.battingFranchiseId === franchiseId && !inn.batters[playerIn.id]) {
                inn.batters[playerIn.id] = {
                    playerId: playerIn.id,
                    name: playerIn.name,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    isOut: false,
                    ovr: playerIn.ovr
                };
                const orderIdx = inn.battingOrder.indexOf(playerOutId);
                if (orderIdx !== -1)
                    inn.battingOrder[orderIdx] = playerIn.id;
            }
            if (inn.bowlingFranchiseId === franchiseId && !inn.bowlers[playerIn.id]) {
                inn.bowlers[playerIn.id] = {
                    playerId: playerIn.id,
                    name: playerIn.name,
                    overs: 0,
                    balls: 0,
                    maidens: 0,
                    runs: 0,
                    wickets: 0,
                    ovr: playerIn.ovr,
                    maxOversAllowed: match.maxBowlerOvers
                };
            }
        }
        match.updatedAt = Date.now();
        return { success: true, message: `Impact Player ${playerIn.name} brought on for ${playerOutId}` };
    }
}
/**
 * Strips secret, uncommitted opponent choices from LiveMatch payload
 * Ensures simultaneous commit integrity: Batter cannot see bowler's choice,
 * Bowler cannot see batter's choice or secret 2x activation.
 */
export function sanitizeMatchForViewer(match, viewerFranchiseId) {
    if (!match)
        return match;
    const clone = JSON.parse(JSON.stringify(match));
    const inputs = clone.pendingInputs || {};
    const inn = clone.currentInnings === 1 ? clone.innings1 : clone.innings2;
    const battingTeam = inn?.battingFranchiseId || clone.batting_team_id;
    const bowlingTeam = inn?.bowlingFranchiseId || clone.bowling_team_id;
    const hasBatterSubmitted = inputs.batterChoice !== undefined;
    const hasBowlerSubmitted = inputs.bowlerChoice !== undefined;
    inputs.hasBatterSubmitted = hasBatterSubmitted;
    inputs.hasBowlerSubmitted = hasBowlerSubmitted;
    // Conceal batter choices from bowler or spectators until delivery resolves
    if (viewerFranchiseId !== battingTeam) {
        delete inputs.batterChoice;
        delete inputs.batterAbility;
    }
    // Conceal bowler choices from batter or spectators until delivery resolves
    if (viewerFranchiseId !== bowlingTeam) {
        delete inputs.bowlerChoice;
        delete inputs.bowlerAbility;
        delete inputs.blockedNumbers;
    }
    // Inject authoritative role & team permissions for viewer
    clone.viewerFranchiseId = viewerFranchiseId;
    clone.toss_winner_team_id = clone.tossWinnerFranchiseId;
    clone.toss_loser_team_id = clone.tossLoserFranchiseId;
    clone.toss_choice = clone.tossDecision || clone.tossCall;
    clone.batting_team_id = battingTeam;
    clone.bowling_team_id = bowlingTeam;
    clone.current_match_phase = clone.status;
    clone.isViewerTossWinner = Boolean(viewerFranchiseId && viewerFranchiseId === clone.tossWinnerFranchiseId);
    clone.isViewerBattingTeam = Boolean(viewerFranchiseId && viewerFranchiseId === battingTeam);
    clone.isViewerBowlingTeam = Boolean(viewerFranchiseId && viewerFranchiseId === bowlingTeam);
    clone.viewerRole = clone.isViewerBattingTeam
        ? 'BATTING'
        : clone.isViewerBowlingTeam
            ? 'BOWLING'
            : 'SPECTATOR';
    return clone;
}
