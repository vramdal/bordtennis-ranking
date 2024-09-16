const rowClasses = ["pkt-txt-54", "pkt-txt-40", "pkt-txt-30", "pkt-txt-20", "pkt-txt-10"];

const SHEET_NAME_DISPLAY_NAMES = "Visningsnavn";
const visningsnavnValues = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME_DISPLAY_NAMES).getDataRange().getValues();
const slackNamesToDisplayNames = new Map(visningsnavnValues.slice(1));

const getDisplayName = (slackName) => {
    return slackNamesToDisplayNames.has(slackName) ? slackNamesToDisplayNames.get(slackName) : slackName;
}

const getRowClass = (index) => {
    return rowClasses[index > rowClasses.length - 1 ? rowClasses.length - 1 : index];
}

const getDataForWebDisplay = () => {
    const rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rankingtabell').getDataRange().getValues().slice(1).map(row => ({
        navn: row[0],
        poeng: row[1]
    }));
    let {currentPoints, currentPosition} = {currentPoints: 0, currentPosition: 0};
    rows.forEach((row, index) => {
        row.posisjon = index > 0 && rows[index - 1].poeng === row.poeng ? rows[index - 1].posisjon : index + 1;
    });
    return rows.map((row, index) => ({
        ...row,
        displayName: getDisplayName(row.navn),
        rowClass: getRowClass(row.posisjon)
    }));
};

const doGet = (event) => {
    const data = getDataForWebDisplay();
    var template = HtmlService.createTemplateFromFile('ranking');
    template.data = data;
    return template.evaluate();
}
