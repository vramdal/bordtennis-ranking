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
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rankingtabell').getDataRange().getValues().slice(1).map(row => ({
        navn: row[0],
        poeng: row[1]
    })).map((row, index) => ({
        ...row,
        displayName: getDisplayName(row.navn),
        rowClass: getRowClass(index)
    }));
};

const doGet = (event) => {
    const data = getDataForWebDisplay();
    var template = HtmlService.createTemplateFromFile('ranking');
    template.data = data;
    return template.evaluate();
}
