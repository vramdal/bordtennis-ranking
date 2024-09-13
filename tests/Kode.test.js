const historyTable = require('../Kode.js').historyTable;
const rankingTable = require('../Kode.js').rankingTable;

const data = [
    ["Simen Heggestøyl", "Vidar Skauge Ramdal", "1725884820", "2", "1", "Vidar Skauge Ramdal", "1725884820"],
    ["Simen Heggestøyl", "Vidar Skauge Ramdal", "1725884824", "1", "2", "Vidar Skauge Ramdal", "1725884824"],
];

describe('kode', () => {
    it('historyTable skal vise en rad pr kamp pr spiller', () => {
        const result = historyTable(data);

        expect(result.map(columns => columns.slice(1))).toEqual([
            ["Simen Heggestøyl", 1250, "Vidar Skauge Ramdal (1250p)", "2 - 1", "Seier", "Ventet", 8, 1258],
            ["Vidar Skauge Ramdal", 1250, "Simen Heggestøyl (1250p)", "1 - 2", "Tap", "Ventet", -7, 1243],
            ["Simen Heggestøyl", 1258, "Vidar Skauge Ramdal (1243p)", "1 - 2", "Tap", "Uventet", -8, 1250],
            ["Vidar Skauge Ramdal", 1243, "Simen Heggestøyl (1258p)", "2 - 1", "Seier", "Uventet", 8, 1251]
        ]);
    });
    it('rankingTable skal vise en sortert tabell over spillere', () => {
        const result = rankingTable(data);
        expect(result).toEqual([
            ["Vidar Skauge Ramdal", 1251],
            ["Simen Heggestøyl", 1250]
        ]);
    })
});

