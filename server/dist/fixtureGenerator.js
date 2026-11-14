export class FixtureGenerator {
    /**
     * Generates fixtures based on tournament team count
     */
    static generateGroupStageFixtures(tournamentId, teamIds, matchOvers) {
        const fixtures = [];
        const n = teamIds.length;
        let matchNumber = 1;
        if (n === 4) {
            // 4 Teams: Double Round-Robin (Each pair plays twice: Home & Away)
            // Round 1 (Home vs Away)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    fixtures.push({
                        id: `FIX-${tournamentId}-M${matchNumber}`,
                        tournamentId,
                        matchNumber,
                        roundNumber: 1,
                        stage: 'GROUP',
                        homeFranchiseId: teamIds[i],
                        awayFranchiseId: teamIds[j],
                        matchOvers,
                        status: 'SCHEDULED',
                        scheduledAt: Date.now() + matchNumber * 60000
                    });
                    matchNumber++;
                }
            }
            // Round 2 (Reverse fixtures)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    fixtures.push({
                        id: `FIX-${tournamentId}-M${matchNumber}`,
                        tournamentId,
                        matchNumber,
                        roundNumber: 2,
                        stage: 'GROUP',
                        homeFranchiseId: teamIds[j],
                        awayFranchiseId: teamIds[i],
                        matchOvers,
                        status: 'SCHEDULED',
                        scheduledAt: Date.now() + matchNumber * 60000
                    });
                    matchNumber++;
                }
            }
        }
        else if (n === 6 || n === 8) {
            // 6 or 8 Teams: Single Round-Robin (Every pair plays once)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    fixtures.push({
                        id: `FIX-${tournamentId}-M${matchNumber}`,
                        tournamentId,
                        matchNumber,
                        roundNumber: 1,
                        stage: 'GROUP',
                        homeFranchiseId: teamIds[i],
                        awayFranchiseId: teamIds[j],
                        matchOvers,
                        status: 'SCHEDULED',
                        scheduledAt: Date.now() + matchNumber * 60000
                    });
                    matchNumber++;
                }
            }
        }
        else if (n === 10) {
            // 10 Teams: 2 Groups of 5
            const groupA = teamIds.slice(0, 5);
            const groupB = teamIds.slice(5, 10);
            // Group A round-robin
            for (let i = 0; i < groupA.length; i++) {
                for (let j = i + 1; j < groupA.length; j++) {
                    fixtures.push({
                        id: `FIX-${tournamentId}-M${matchNumber}`,
                        tournamentId,
                        matchNumber,
                        roundNumber: 1,
                        stage: 'GROUP',
                        homeFranchiseId: groupA[i],
                        awayFranchiseId: groupA[j],
                        matchOvers,
                        status: 'SCHEDULED',
                        scheduledAt: Date.now() + matchNumber * 60000
                    });
                    matchNumber++;
                }
            }
            // Group B round-robin
            for (let i = 0; i < groupB.length; i++) {
                for (let j = i + 1; j < groupB.length; j++) {
                    fixtures.push({
                        id: `FIX-${tournamentId}-M${matchNumber}`,
                        tournamentId,
                        matchNumber,
                        roundNumber: 1,
                        stage: 'GROUP',
                        homeFranchiseId: groupB[i],
                        awayFranchiseId: groupB[j],
                        matchOvers,
                        status: 'SCHEDULED',
                        scheduledAt: Date.now() + matchNumber * 60000
                    });
                    matchNumber++;
                }
            }
        }
        else {
            // General Round-Robin fallback for any team count (guarantees every team plays with no duplicates)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    fixtures.push({
                        id: `FIX-${tournamentId}-M${matchNumber}`,
                        tournamentId,
                        matchNumber,
                        roundNumber: 1,
                        stage: 'GROUP',
                        homeFranchiseId: teamIds[i],
                        awayFranchiseId: teamIds[j],
                        matchOvers,
                        status: 'SCHEDULED',
                        scheduledAt: Date.now() + matchNumber * 60000
                    });
                    matchNumber++;
                }
            }
        }
        return fixtures;
    }
    /**
     * Generates playoff fixtures based on standings
     */
    static generateNextPlayoffFixture(tournamentId, teamsCount, standings, completedPlayoffs, matchOvers) {
        const nextMatchNum = (completedPlayoffs.length > 0 ? Math.max(...completedPlayoffs.map(p => p.matchNumber)) : 0) + 1;
        if (teamsCount === 4) {
            // Top 2 play Final
            const hasFinal = completedPlayoffs.some(p => p.stage === 'FINAL');
            if (!hasFinal && standings.length >= 2) {
                return {
                    id: `FIX-${tournamentId}-FINAL`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 3,
                    stage: 'FINAL',
                    homeFranchiseId: standings[0],
                    awayFranchiseId: standings[1],
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
        }
        else if (teamsCount === 6 || teamsCount === 8) {
            // Top 4 IPL-style Playoffs:
            // 1. Qualifier 1 (1 vs 2)
            // 2. Eliminator (3 vs 4)
            // 3. Qualifier 2 (Loser Q1 vs Winner Elim)
            // 4. Final (Winner Q1 vs Winner Q2)
            const q1 = completedPlayoffs.find(p => p.stage === 'QUALIFIER_1');
            const elim = completedPlayoffs.find(p => p.stage === 'ELIMINATOR');
            const q2 = completedPlayoffs.find(p => p.stage === 'QUALIFIER_2');
            const finalMatch = completedPlayoffs.find(p => p.stage === 'FINAL');
            if (!q1 && standings.length >= 2) {
                return {
                    id: `FIX-${tournamentId}-Q1`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 2,
                    stage: 'QUALIFIER_1',
                    homeFranchiseId: standings[0],
                    awayFranchiseId: standings[1],
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
            if (!elim && standings.length >= 4) {
                return {
                    id: `FIX-${tournamentId}-ELIM`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 2,
                    stage: 'ELIMINATOR',
                    homeFranchiseId: standings[2],
                    awayFranchiseId: standings[3],
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
            if (q1 && elim && q1.status === 'COMPLETED' && elim.status === 'COMPLETED' && !q2) {
                const loserQ1 = q1.winnerFranchiseId === q1.homeFranchiseId ? q1.awayFranchiseId : q1.homeFranchiseId;
                const winnerElim = elim.winnerFranchiseId;
                return {
                    id: `FIX-${tournamentId}-Q2`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 3,
                    stage: 'QUALIFIER_2',
                    homeFranchiseId: loserQ1,
                    awayFranchiseId: winnerElim,
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
            if (q1 && q2 && q1.status === 'COMPLETED' && q2.status === 'COMPLETED' && !finalMatch) {
                const winnerQ1 = q1.winnerFranchiseId;
                const winnerQ2 = q2.winnerFranchiseId;
                return {
                    id: `FIX-${tournamentId}-FINAL`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 4,
                    stage: 'FINAL',
                    homeFranchiseId: winnerQ1,
                    awayFranchiseId: winnerQ2,
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
        }
        else if (teamsCount === 10) {
            // 10 Teams: Semifinal 1 (A1 vs B2), Semifinal 2 (B1 vs A2), Final
            const sf1 = completedPlayoffs.find(p => p.stage === 'SEMI_FINAL_1');
            const sf2 = completedPlayoffs.find(p => p.stage === 'SEMI_FINAL_2');
            const finalMatch = completedPlayoffs.find(p => p.stage === 'FINAL');
            if (!sf1 && standings.length >= 4) {
                return {
                    id: `FIX-${tournamentId}-SF1`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 2,
                    stage: 'SEMI_FINAL_1',
                    homeFranchiseId: standings[0],
                    awayFranchiseId: standings[3],
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
            if (!sf2 && standings.length >= 4) {
                return {
                    id: `FIX-${tournamentId}-SF2`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 2,
                    stage: 'SEMI_FINAL_2',
                    homeFranchiseId: standings[1],
                    awayFranchiseId: standings[2],
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
            if (sf1 && sf2 && sf1.status === 'COMPLETED' && sf2.status === 'COMPLETED' && !finalMatch) {
                return {
                    id: `FIX-${tournamentId}-FINAL`,
                    tournamentId,
                    matchNumber: nextMatchNum,
                    roundNumber: 3,
                    stage: 'FINAL',
                    homeFranchiseId: sf1.winnerFranchiseId,
                    awayFranchiseId: sf2.winnerFranchiseId,
                    matchOvers,
                    status: 'SCHEDULED',
                    scheduledAt: Date.now()
                };
            }
        }
        return null;
    }
}
