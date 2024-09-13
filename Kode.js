const SHEET_NAME_DETAILS = "Detaljer";

const SHEET_NAME_DATA = "Form Responses";
const COL_IDX_PLAYER_1 = 0;
const COL_IDX_PLAYER_2 = 1;
const COL_IDX_MATCH_DATETIME = 2;
const COL_IDX_SET_PLAYER_1 = 3;
const COL_IDX_SET_PLAYER_2 = 4;
const COL_IDX_SUBMITTER = 5;

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
        submitter: columnValues[COL_IDX_SUBMITTER]
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

const gameRankingPointOutcome = (rankingDiff) => {
    // [uventet resultat seier, uventet resultat tap, forventet resultat seier, forventet resultat tap]
    if (rankingDiff === 0) {
        return [8, -7, 8, -7]
    } else if (rankingDiff <= 49) {
        return [8, -8, 8, -6]
    } else if (rankingDiff <= 99) {
        return [10, -10, 5, -5]
    } else if (rankingDiff <= 149) {
        return [12, -12, 6, -4]
    } else if (rankingDiff <= 199) {
        return [14, -14, 5, -3]
    } else if (rankingDiff <= 299) {
        return [16, -16, 4, -2]
    } else if (rankingDiff <= 399) {
        return [18, -18, 3, -2]
    } else if (rankingDiff <= 599) {
        return [20, -20, 2, -1]
    } else {
        return [25, -25, 1, -1];
    }
}

const getGamesAndusers = data => {
    const games = parseDataToGames(chopArray(data, 0));
    const userNames = getUniqueUsers(games);
    return {games, userNames};
};

const getPlayerGame = (game, pos, playerRankings) => {
    return {
        name: game[`player${pos + 1}`],
        sets: game[`setPlayer${pos + 1}`],
        opponent: game[`player${(pos + 1) === 1 ? 2 : 1}`],
        opponentSets: game[`setPlayer${(pos + 1) === 1 ? 2 : 1}`],
        datetime: game.datetime,
        playerRanking: playerRankings[pos],
        opponentRanking: playerRankings[pos === 1 ? 0 : 1]
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
    const usersWithRankingPointsHistory = new Map(userNames.values().map(userName => ([userName, [RATING_START_POINTS]])));

    const getPlayerRankingHistory = userName => usersWithRankingPointsHistory.get(userName);

    const getPlayerRanking = (rankingPlayerHistories, pos) => Math.max(0, rankingPlayerHistories[pos].reduce((a, b) => a + b, 0));

    const getRankingPointsOutcomes = (expectedWinnerName, winnerName, playerRankingsBefore, gamePlayers) => {
        const isResultExpected = expectedWinnerName === undefined || winnerName === expectedWinnerName;
        const rankingDiff = Math.abs(playerRankingsBefore[HOME] - playerRankingsBefore[AWAY]);
        const pointOutcomes = gameRankingPointOutcome(rankingDiff);
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
        } = getRankingPointsOutcomes(expectedWinnerName, winnerName, playerRankingsBefore, gamePlayers);
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
            new Date(game.datetime * 1000), `${(gamePlayer.name)}`, gamePlayer.playerRanking, `${(gamePlayer.opponent)} (${gamePlayer.opponentRanking}p)`, `${(gamePlayer.sets)} - ${(gamePlayer.opponentSets)}`, gamePlayer.sets > gamePlayer.opponentSets ? "Seier" : "Tap", isResultExpected ? "Ventet" : "Uventet", rankingPointsEarnedPrPlayer[pos], playerRankingsAfter[pos]
        ]);

    }));
    return resultsTable;
}

const rankingTable = (data) => {
    const {usersWithRankingPointsHistory} = beregnPoeng(data);
    return Array.from(usersWithRankingPointsHistory.entries().map(([userName, rankingPointsHistory]) => [userName, rankingPointsHistory.reduce((a, b) => a + b, 0)])).toSorted((a, b) => b[1] - a[1]);
}

/*
module.exports = {
    historyTable,
    rankingTable
}
*/
