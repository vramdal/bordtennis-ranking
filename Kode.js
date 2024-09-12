const SHEET_NAME_DETAILS = "Detaljer";

const SHEET_NAME_DATA = "Form Responses";
const COL_IDX_PLAYER_1 = 0;
const COL_IDX_PLAYER_2 = 1;
const COL_IDX_MATCH_DATETIME = 2;
const COL_IDX_SET_PLAYER_1 = 3;
const COL_IDX_SET_PLAYER_2 = 4;
const COL_IDX_SUBMITTER = 5;

const RATING_START_POINTS = 1250;

function chopArray(arr, col) {
  var resultat = [];
  for (var i = 0; i < arr.length; i++) {
    if (col !== undefined && arr[i][col] === "") {
      break;
    } else if (col === undefined && arr[i] == "") {
      break;
    }
    resultat.push(arr[i]);
  }
  return resultat;
}

const parseRowToGame = (columnValues) => {
  return {
    player1: columnValues[COL_IDX_PLAYER_1],
    player2: columnValues[COL_IDX_PLAYER_2],
    datetime: columnValues[COL_IDX_MATCH_DATETIME],
    setPlayer1 : columnValues[COL_IDX_SET_PLAYER_1],
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

const beregnPoeng = (data) => {
  const games = parseDataToGames(chopArray(data, 0));
  const userNames = getUniqueUsers(games);
  const usersWithRankingPointsHistory = new Map(userNames.values().map(userName => ([userName, [RATING_START_POINTS]])));
  const resultsTable = [];
  games.forEach(game => {
    const rankingPlayer1History = usersWithRankingPointsHistory.get(game.player1);
    const rankingPlayer2History = usersWithRankingPointsHistory.get(game.player2);
    const rankingPlayer1 = Math.max(0, rankingPlayer1History.reduce((a, b) => a + b, 0));
    const rankingPlayer2 = Math.max(0, rankingPlayer2History.reduce((a, b) => a + b, 0));
    const rankingDiff = Math.abs(rankingPlayer1History - rankingPlayer2History);
    const expectedWinner = rankingPlayer1 > rankingPlayer2 ? game.player1 : (rankingPlayer2 > rankingPlayer1 ? game.player2 : undefined);
    const winner = game.setPlayer1 > game.setPlayer2 ? game.player1 : game.player2;
    const pointOutcomes = gameRankingPointOutcome(rankingDiff);
    const isResultExpected = expectedWinner === undefined || winner === expectedWinner;
    let rankingPointsEarnedPlayer1 = 0;
    let rankingPointsEarnedPlayer2 = 0;
    if (isResultExpected) {
      if (winner === game.player1) {
        rankingPointsEarnedPlayer1 = pointOutcomes[2];
        rankingPointsEarnedPlayer2 = pointOutcomes[3];
      } else {
        rankingPointsEarnedPlayer1 = pointOutcomes[3];
        rankingPointsEarnedPlayer2 = pointOutcomes[2];
      }
    } else {
      if (winner === game.player1) {
        rankingPointsEarnedPlayer1 = pointOutcomes[0];
        rankingPointsEarnedPlayer2 = pointOutcomes[1];
      } else {
        rankingPointsEarnedPlayer1 = pointOutcomes[1];
        rankingPointsEarnedPlayer2 = pointOutcomes[2];
      }
    }
    usersWithRankingPointsHistory.set(game.player1, [...rankingPlayer1History, rankingPointsEarnedPlayer1]);
    usersWithRankingPointsHistory.set(game.player2, [...rankingPlayer2History, rankingPointsEarnedPlayer2]);
    /*resultsTable.push([
      game.datetime, game.player1, rankingPlayer1, game.player2, rankingPlayer2, game.setPlayer1, game.setPlayer2, isResultExpected ? "Ventet" : "Uventet", rankingPointsEarnedPlayer1, rankingPointsEarnedPlayer2, Math.max(0, rankingPlayer1 + rankingPointsEarnedPlayer1), Math.max(0, rankingPlayer2 + rankingPointsEarnedPlayer2)
    ])*/
    resultsTable.push([
      new Date(game.datetime * 1000), `${game.player1}`, rankingPlayer1, `${game.player2} (${rankingPlayer2}p)`, `${game.setPlayer1} - ${game.setPlayer2}`, game.setPlayer1 > game.setPlayer2 ? "Seier" : "Tap", isResultExpected ? "Ventet" : "Uventet", rankingPointsEarnedPlayer1, rankingPointsEarnedPlayer1 + rankingPlayer1
    ]);
    resultsTable.push([
      new Date(game.datetime * 1000), `${game.player2}`, rankingPlayer2, `${game.player1} (${rankingPlayer1}p)`, `${game.setPlayer2} - ${game.setPlayer1}`, game.setPlayer2 > game.setPlayer1 ? "Seier" : "Tap", isResultExpected ? "Ventet" : "Uventet", rankingPointsEarnedPlayer2, rankingPointsEarnedPlayer2 + rankingPlayer2
    ]);
  });
  return resultsTable;
}

module.exports = {
  beregnPoeng
}
