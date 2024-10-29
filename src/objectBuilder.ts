import { writeFile, writeFileText, makeDirectory } from "./file";
import { clean, getDupIndex } from "./utility";

export function mergeDuplicateRecords(arr) {

    const processedIndexes = [];
    const unDuped = arr.map((item, idx) => {

        const dupIndex = getDupIndex(arr, item, idx);
        if (dupIndex === -1 || (processedIndexes as string[]).includes(idx)) return item;

        // merge weights for more accurate reading -- as dups means they caught on either end of the divide of pagination by weighting
        const dupItem = arr[dupIndex];
        processedIndexes.push(Number(dupIndex));
        arr[dupIndex].weight = (dupItem.weight + item.weight) / 2;
        return;
    })

    const cleanedunDuped = clean(unDuped);
    return cleanedunDuped;

}

function calculate(results) {
    const definedResults = results.filter(x => x);
    console.log("Results have been processed, there are ", definedResults.length);
    return definedResults;
}

function getRankedList(records) {
    return records.map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}

function getMostDisagreedUpon(records) {
    let idx = 1;

    // there is no point in getting more than top 500 as they may be poor and strange
    for (let record of records) {
        record.disagree = record.rank && record.rank > 0 && record.rank < 1000 ? record.rank - idx : -9999;
        record.nateRank = idx;
        idx++;
    }

    records.sort((a, b) => parseFloat(b.disagree) - parseFloat(a.disagree));
    return records.filter(x => x.disagree !== -9999).map((game, idx) => `${game.title} (${game.releaseDate}) BGG #${game.rank} -> NOW #${game.nateRank}, ${-game.disagree}`).join('\n');
}

function getMostRecent(records) {
    let output = '';
    for (let year = 2024; year > 2000; year--) {
        const games = records.filter(x => Number(x.releaseDate) === year).map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`);
        const fiftyGames = [...games].slice(0, 50).join('\n');
        output += `${year}\n----------\n${fiftyGames}\n\n-----------\n`;
    }

    return output;
}

export function scoreRecordsAndRecord(records, bias, bias_multiplier) {

    makeDirectory(getPath(String(bias), String(bias_multiplier)), () => {

        for (let record of records) {

            const bias_median = Math.abs(5 - Math.abs(4-bias)) / 2;
            //const biasFactor = bias === 0 ? 2 : 1 + (added_bias + Math.abs(record.weight - bias))*bias_multiplier;
    
            const bias_value = Math.abs(record.weight - bias);
            const bias_consideration = bias_multiplier;
    
            /*
                    Bias consideration should be between 1 and 4, but could go even higher in rare cases
                    1: minor bias
                    2: standard bias
                    3: heavy bias
                    4: ultra bias
            */
    
            const biasFactor = bias === 0 ? 2 : 1 + 1 / bias_consideration + bias_consideration * (bias_value / bias_median);
            record.score = Math.pow((record.average / 10), biasFactor) * Math.log10(record.num);
        }
    
        let newRecords = [...records.filter((x) => !!x.score)];

        const bias_multiplier_copy : string = String(bias_multiplier);
        const bias_copy : string = String(bias);

        const path: string = getPath(bias_copy, bias_multiplier_copy);

        newRecords.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
        writeFile(newRecords, `${path}/raw_objects.json`);

        const list = getRankedList([...newRecords]);
        writeFileText(list, `${path}/ALL_RANKINGS.txt`);

        const mostDisagreed = getMostDisagreedUpon([...newRecords]);
        writeFileText(mostDisagreed, `${path}/disagreement.txt`);

        const mostRecent = getMostRecent([...newRecords]);
        writeFileText(mostRecent, `${path}/RANKINGS_BY_YEAR.txt`);

    });

}

function getPath(bias: string, bias_multiplier: string) {
/*
    let multiplier_text = {
        "2": "somewhat",
        "3": "",
        "4": "VERY much"
    }[bias_multiplier];
*/
    let dir: string = 'output/' + {
        "0": `0 - I prefer ALL games`,
        "1": `1 - I prefer light games`,
        "2": `2 - I prefer medium-light games`,
        "2.2": `2.2 - ish`,
        "2.5": `2.5 - mediumish`,
        "3": `3 - I prefer medium games`,
        "4": `4 - I prefer medium-heavy games`,
        "5": `5 - I prefer heavy games`
    }[bias];
    return dir;
};

