const SHEET_NAME_DETAILS = "Detaljer";

const SHEET_NAME_DATA = "Form Responses";
const COL_IDX_PLAYER_1 = 0;
const COL_IDX_PLAYER_2 = 1;
const COL_IDX_MATCH_DATETIME = 2;
const COL_IDX_SET_PLAYER_1 = 3;
const COL_IDX_SET_PLAYER_2 = 4;
const COL_IDX_SUBMITTER = 5;
const COL_IDX_HANDICAP = 7;

const RATING_START_POINTS = 1250;

const chopArray = (arr, col) => {
    const result = [];
    for (var i = 0; i < arr.length; i++) {
        if (col !== undefined && arr[i][col] === "") {
            break;
        } else if (col === undefined && arr[i] === "") {
            break;
        }
        result.push(arr[i]);
    }
    return result;
};

const parseRowToGame = (columnValues) => {
    return {
        player1: columnValues[COL_IDX_PLAYER_1],
        player2: columnValues[COL_IDX_PLAYER_2],
        datetime: columnValues[COL_IDX_MATCH_DATETIME],
        setPlayer1: columnValues[COL_IDX_SET_PLAYER_1],
        setPlayer2: columnValues[COL_IDX_SET_PLAYER_2],
        submitter: columnValues[COL_IDX_SUBMITTER],
        handicap: columnValues[COL_IDX_HANDICAP] || 0
    }
}

const parseDataToGames = (rows) => {
    return rows.map(parseRowToGame).sort((game1, game2) => game1.datetime - game2.datetime);
}

const getUniqueUsers = (games) => {
    const users1Set = new Set(games.map(game => game.player1));
    const users2Set = new Set(games.map(game => game.player2));
    return users1Set.union(users2Set);
}

const gameRankingPointOutcome = (rankingDiff, handicap) => {
    // [uventet resultat seier, uventet resultat tap, forventet resultat seier, forventet resultat tap]
    let outcomeBeforeHandicap;
    if (rankingDiff === 0) {
        outcomeBeforeHandicap = [8, -7, 8, -7]
    } else if (rankingDiff <= 49) {
        outcomeBeforeHandicap = [8, -8, 8, -6]
    } else if (rankingDiff <= 99) {
        outcomeBeforeHandicap = [10, -10, 5, -5]
    } else if (rankingDiff <= 149) {
        outcomeBeforeHandicap = [12, -12, 6, -4]
    } else if (rankingDiff <= 199) {
        outcomeBeforeHandicap = [14, -14, 5, -3]
    } else if (rankingDiff <= 299) {
        outcomeBeforeHandicap = [16, -16, 4, -2]
    } else if (rankingDiff <= 399) {
        outcomeBeforeHandicap = [18, -18, 3, -2]
    } else if (rankingDiff <= 599) {
        outcomeBeforeHandicap = [20, -20, 2, -1]
    } else {
        outcomeBeforeHandicap = [25, -25, 1, -1];
    }
    const outcome = handicap === 0 ? outcomeBeforeHandicap : outcomeBeforeHandicap.map(outcome => {
        if (outcome > 0) {
            return Math.max(outcome - handicap * -1, 1);
        } else {
            return Math.min(outcome + handicap * -1, -1);
        }
    });
    Logger.log("rankingDiff: " + rankingDiff + " handicap: " + handicap + " outcome: " + JSON.stringify(outcome));
    return outcome;
}

const getGamesAndusers = data => {
    const games = parseDataToGames(chopArray(data, 0));
    const userNames = getUniqueUsers(games);
    return {games, userNames};
};

const getPlayerGame = (game, pos, playerRankings) => {
    const rankingDiff = playerRankings[pos] - playerRankings[pos === 1 ? 0 : 1];
    const isExpectedToWin = rankingDiff > 0 && 'YES' || rankingDiff < 0 && 'NO' || undefined;
    return {
        name: game[`player${pos + 1}`],
        sets: game[`setPlayer${pos + 1}`],
        opponent: game[`player${(pos + 1) === 1 ? 2 : 1}`],
        opponentSets: game[`setPlayer${(pos + 1) === 1 ? 2 : 1}`],
        datetime: game.datetime,
        playerRanking: playerRankings[pos],
        opponentRanking: playerRankings[pos === 1 ? 0 : 1],
        advantage: game.handicap && (isExpectedToWin === 'YES' && game.handicap * -1) || (isExpectedToWin === 'NO' && game.handicap) || 0
    };
}

const HOME = 0;
const AWAY = 1;

const getRankingPointsEarnedPrPlayer = (isResultExpected, winnerName, gamePlayers, pointOutcomes) => {
    const rankingPointsEarnedPrPlayer = [0, 0];
    if (isResultExpected) {
        if (winnerName === gamePlayers[HOME].name) {
            rankingPointsEarnedPrPlayer[HOME] = pointOutcomes[2];
            rankingPointsEarnedPrPlayer[AWAY] = pointOutcomes[3];
        } else {
            rankingPointsEarnedPrPlayer[HOME] = pointOutcomes[3];
            rankingPointsEarnedPrPlayer[AWAY] = pointOutcomes[2];
        }
    } else {
        if (winnerName === gamePlayers[HOME].name) {
            rankingPointsEarnedPrPlayer[HOME] = pointOutcomes[0];
            rankingPointsEarnedPrPlayer[AWAY] = pointOutcomes[1];
        } else {
            rankingPointsEarnedPrPlayer[HOME] = pointOutcomes[1];
            rankingPointsEarnedPrPlayer[AWAY] = pointOutcomes[2];
        }
    }
    return rankingPointsEarnedPrPlayer;
};

const beregnPoeng = (data, gameListener) => {
    const {games, userNames} = getGamesAndusers(data);
    const startPoints = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_DISPLAY_NAMES).getDataRange().getValues().slice(1).map(row => ({
        userName: row[0],
        displayName: row[1],
        startPoints: row[2]
    }));
    const usersWithRankingPointsHistory = new Map(userNames.values().map(userName => {
        const foundInDisplayNames = startPoints.find(user => user.userName === userName);
        return ([userName, [foundInDisplayNames && foundInDisplayNames.startPoints || RATING_START_POINTS]]);
    }));

    const getPlayerRankingHistory = userName => usersWithRankingPointsHistory.get(userName);

    const getPlayerRanking = (rankingPlayerHistories, pos) => Math.max(0, rankingPlayerHistories[pos].reduce((a, b) => a + b, 0));

    const getRankingPointsOutcomes = (expectedWinnerName, winnerName, playerRankingsBefore, gamePlayers, handicap) => {
        const isResultExpected = expectedWinnerName === undefined || winnerName === expectedWinnerName;
        const rankingDiff = Math.abs(playerRankingsBefore[HOME] - playerRankingsBefore[AWAY]);
        const pointOutcomes = gameRankingPointOutcome(rankingDiff, handicap);
        const rankingPointsEarnedPrPlayer = getRankingPointsEarnedPrPlayer(isResultExpected, winnerName, gamePlayers, pointOutcomes);
        return {isResultExpected, rankingPointsEarnedPrPlayer};
    };

    games.forEach(game => {
        const playerNames = [game.player1, game.player2];
        const rankingPlayerHistories = playerNames.map(playerName => getPlayerRankingHistory(playerName));
        const playerRankingsBefore = [0, 1].map(pos => getPlayerRanking(rankingPlayerHistories, pos));
        const gamePlayers = [0, 1].map(pos => getPlayerGame(game, pos, playerRankingsBefore));
        const expectedWinnerName = gamePlayers[HOME].playerRanking === gamePlayers[AWAY].playerRanking ? undefined :
            (gamePlayers[HOME].playerRanking > gamePlayers[AWAY].playerRanking ? gamePlayers[HOME].name : gamePlayers[AWAY].name);
        const winnerName = gamePlayers.toSorted((a, b) => b.sets - a.sets)[0].name;
        const {
            isResultExpected,
            rankingPointsEarnedPrPlayer
        } = getRankingPointsOutcomes(expectedWinnerName, winnerName, playerRankingsBefore, gamePlayers, game.handicap);
        const playerRankingsAfter = playerRankingsBefore.map((playerRankingBefore, pos) => playerRankingBefore + rankingPointsEarnedPrPlayer[pos]);
        rankingPointsEarnedPrPlayer.forEach((points, pos) => usersWithRankingPointsHistory.set(gamePlayers[pos].name, [...(rankingPlayerHistories[pos]), rankingPointsEarnedPrPlayer[pos]]));
        gameListener && gameListener({
            game,
            gamePlayers,
            rankingPointsEarnedPrPlayer,
            playerRankingsAfter,
            isResultExpected
        });
    });
    return {usersWithRankingPointsHistory};
}

const historyTable = (data) => {
    const resultsTable = [];
    beregnPoeng(data, ({
                           game,
                           gamePlayers,
                           rankingPointsEarnedPrPlayer,
                           playerRankingsAfter,
                           isResultExpected
                       }) => gamePlayers.forEach((gamePlayer, pos) => {
        resultsTable.push([
            new Date(game.datetime * 1000), `${(gamePlayer.name)}`, gamePlayer.playerRanking, `${(gamePlayer.opponent)} (${gamePlayer.opponentRanking}p)`, `${(gamePlayer.sets)} - ${(gamePlayer.opponentSets)}`, gamePlayer.advantage, gamePlayer.sets > gamePlayer.opponentSets ? "Seier" : "Tap", isResultExpected ? "Ventet" : "Uventet", rankingPointsEarnedPrPlayer[pos], playerRankingsAfter[pos]
        ]);

    }));
    return resultsTable;
}

const rankingTable = (data) => {
    const numGamesPrUser = new Map();
    const {usersWithRankingPointsHistory} = beregnPoeng(data, ({
                                                                   game,
                                                                   gamePlayers,
                                                                   rankingPointsEarnedPrPlayer,
                                                                   playerRankingsAfter,
                                                                   isResultExpected
                                                               }) => {
        gamePlayers.forEach((gamePlayer, pos) => {
            const numGames = numGamesPrUser.get(gamePlayer.name) || 0;
            const delta = gamePlayer.name === 'Håkon Lexberg' ? 0.5 : 1;
            numGamesPrUser.set(gamePlayer.name, numGames + delta);
        });
    });
    return Array.from(usersWithRankingPointsHistory.entries().map(([userName, rankingPointsHistory]) => [userName, rankingPointsHistory.reduce((a, b) => a + b, 0)])).toSorted((a, b) => b[1] - a[1]).map(([userName, points], idx) => [userName, points, idx + 1, getDisplayName(userName), numGamesPrUser.get(userName)]);
}

/*
module.exports = {
    historyTable,
    rankingTable
}
*/

const SHEET_NAME_CHALLENGES = "Utfordringer";
const SHEET_NAME_RANKINGTABLE = "Rankingtabell";

const getHandicapRecommendation = (userRanking1, userRanking2) => {
    const rankingDiff = userRanking1.points - userRanking2.points;
    const recommendedHandicap = Math.min(Math.floor(Math.abs(rankingDiff) / 25), 8);
    if (Math.abs(rankingDiff) >= 50) {
        return `${userRanking1.displayName} har ${userRanking1.points} rankingpoeng, ${userRanking2.displayName} har ${userRanking2.points}. Hvis dere vil gjøre det spennende, kan ${rankingDiff < 0 ? userRanking1.displayName : userRanking2.displayName} starte med ${recommendedHandicap}-0`;
    } else {
        return `${userRanking1.displayName} har ${userRanking1.points} rankingpoeng, ${userRanking2.displayName} har ${userRanking2.points}. Dette blir jevnt!`;
    }
}

const challengeRecommendations = (rows) => {
    rows = chopArray(rows, 0);
    const rankingTable = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_RANKINGTABLE);
    const userRankings = rankingTable.getDataRange().getValues().map(row => ({
        name: row[0],
        points: row[1],
        position: row[2],
        displayName: row[3]
    }));
    Logger.log(userRankings.length + " users found");
    const findUser = name => userRankings.find(user => user.name === name);
    Logger.log(rows.length + " challenges found");
    return rows.map((row) => {
        const player1 = findUser(row[1]);
        const player2 = findUser(row[2]);
        const rankingDiff = (player1 && player2) && (player1.points - player2.points);
        Logger.log("Player 1: " + player1 + ", Player 2: " + player2, "Ranking diff: " + rankingDiff);
        let handicapRecommendation;
        if (rankingDiff !== undefined) {
            handicapRecommendation = getHandicapRecommendation(player1, player2);
            Logger.log("Handicap recommendation: " + handicapRecommendation);
        } else {
            handicapRecommendation = "Dette blir spennende!";
        }
        return [player1 && player1.points || "", player2 && player2.points || "", rankingDiff || 0, handicapRecommendation || ""];
    });
}

const getRankingMessages = (slackNameRows, rankingTableValues) => {
    const namesAndMessages = chopArray(rankingTableValues, 0).map((row, rowIndex) => {
        const slackName = row[0];
        let melding = `Du har ${row[1]} rankingpoeng og ligger på ${row[2]}. plass`;
        // Det er bare x poeng opp til nn på neste plass
        if (rowIndex < rankingTableValues.length - 1) {
            melding += `, og det er ${rankingTableValues[rowIndex][1] - rankingTableValues[rowIndex + 1][1]} poeng ned til ${rankingTableValues[rowIndex + 1][3]}`;
        }
        // nn ligger bak deg med x poeng
        if (rowIndex > 0) {
            melding += `, og det er bare ${rankingTableValues[rowIndex - 1][1] - rankingTableValues[rowIndex][1]} poeng opp til ${rankingTableValues[rowIndex - 1][3]} på ${rankingTableValues[rowIndex - 1][2]}. plass`;
        }
        return [slackName, melding];
    });
    Logger.log("namesAndMessages " + JSON.stringify(namesAndMessages))
    return chopArray(slackNameRows, 0).map(slackNameRow => {
        const nameAndMessage = namesAndMessages.find(nameAndMessage => nameAndMessage[0] === slackNameRow[0]);
        return nameAndMessage && nameAndMessage[1] || "Du har ingen ranking foreløpig. Hva med å utfordre noen?";
    })
}
