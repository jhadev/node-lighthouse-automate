const fs = require('fs');
// turn callbacks into promises
const { promisify } = require('util');
// execute shell commands
const sh = require('shelljs');
const moment = require('moment');
require('dotenv').config();

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const readDir = promisify(fs.readdir);
const exists = promisify(fs.exists);
const makeDir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

// TODO: fix file name structure
let now = moment().format('YYYY-MM-DD-HH-MM-ss');
console.log(now);
let today = moment().format('YYYY-MM-DD');
console.log(today);
let yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

const lighthouseCommand = `lighthouse ${process.env.URL} --extra-headers=./headers.json --output json --output csv --output-path=./reports/coach-${now}.json --chrome-flags="--headless" --save-assets`;

const importToDb = `mongoimport --jsonArray -d lighthouse-automation -c data --file .//reports/lastSavedReport.json`;

// make sure lighthouse finishes before moving on to next task
const runLighthouse = (command) => {
  return new Promise((resolve, reject) => {
    sh.exec(command, (code, output) => {
      console.log(output);
      resolve();
    });
  });
};

const saveToDb = async () => {
  // wait for lighthouse to finish
  await runLighthouse(lighthouseCommand);
  // file path for lighthouse output
  const path = `./reports/coach-${now}.report.json`;
  // read json
  let data = await read(path, 'utf8');
  // put json data into an array
  data = [JSON.parse(data)];
  // overwrite json file with array
  await write('./reports/lastSavedReport.json', JSON.stringify(data, null, 2));
  // import into mongo
  sh.exec(importToDb, (code, output) => {
    console.log(output);
  });
};

const isFileFromToday = (fileName) => {
  if (fileName.includes(today) && fileName.includes('.report.json')) {
    return fileName;
  }

  return false;
};

const getFilesForToday = async () => {
  const fileNames = await readDir('./reports/');

  const onlyToday = fileNames.filter(isFileFromToday);

  return Promise.all(
    onlyToday.map(async (file) => {
      return await read(`./reports/${file}`, 'utf8');
    })
  );
};

const getKeyMetrics = async () => {
  const files = await getFilesForToday();

  const onlyKeyMetrics = files.map((file) => {
    file = JSON.parse(file);
    return {
      userAgent: file.userAgent,
      fetchTime: file.fetchTime,
      url: file.finalUrl,
      firstMeaningfulPaint: file.audits['first-meaningful-paint'],
      firstContentfulPaint: file.audits['first-contentful-paint'],
      speedIndex: file.audits['speed-index'],
      interactive: file.audits['interactive'],
      firstCPUIdle: file.audits['first-cpu-idle'],
      score: file.categories.performance.score,
    };
  });

  const totalItems = onlyKeyMetrics.length;
  const initialValue = {
    date: today,
    url: '',
    score: 0,
    firstContentfulPaint: { score: 0, numericValue: 0 },
    firstMeaningfulPaint: { score: 0, numericValue: 0 },
    speedIndex: { score: 0, numericValue: 0 },
    interactive: { score: 0, numericValue: 0 },
    firstCPUIdle: { score: 0, numericValue: 0 },
  };
  // TODO: refactor
  const sums = onlyKeyMetrics.reduce((total, next) => {
    return {
      date: today,
      url: next.url,
      score: total.score + next.score,
      firstMeaningfulPaint: {
        score:
          total.firstMeaningfulPaint.score + next.firstMeaningfulPaint.score,
        numericValue:
          total.firstMeaningfulPaint.numericValue +
          next.firstMeaningfulPaint.numericValue,
      },
      firstContentfulPaint: {
        score:
          total.firstContentfulPaint.score + next.firstContentfulPaint.score,
        numericValue:
          total.firstContentfulPaint.numericValue +
          next.firstContentfulPaint.numericValue,
      },
      speedIndex: {
        score: total.speedIndex.score + next.speedIndex.score,
        numericValue:
          total.speedIndex.numericValue + next.speedIndex.numericValue,
      },
      interactive: {
        score: total.interactive.score + next.interactive.score,
        numericValue:
          total.interactive.numericValue + next.interactive.numericValue,
      },
      firstCPUIdle: {
        score: total.firstCPUIdle.score + next.firstCPUIdle.score,
        numericValue:
          total.firstCPUIdle.numericValue + next.firstCPUIdle.numericValue,
      },
    };
  }, initialValue);

  const averages = {
    ...sums,
    reportsTotal: totalItems,
    score: sums.score / totalItems,
    firstMeaningfulPaint: {
      score: sums.firstMeaningfulPaint.score / totalItems,
      numericValue: sums.firstMeaningfulPaint.numericValue / totalItems,
    },
    firstContentfulPaint: {
      score: sums.firstContentfulPaint.score / totalItems,
      numericValue: sums.firstContentfulPaint.numericValue / totalItems,
    },
    speedIndex: {
      score: sums.speedIndex.score / totalItems,
      numericValue: sums.speedIndex.numericValue / totalItems,
    },
    interactive: {
      score: sums.interactive.score / totalItems,
      numericValue: sums.interactive.numericValue / totalItems,
    },
    firstCPUIdle: {
      score: sums.firstCPUIdle.score / totalItems,
      numericValue: sums.firstCPUIdle.numericValue / totalItems,
    },
  };

  return averages;
};

const writeAvgs = async () => {
  const averages = await getKeyMetrics();

  return await write(
    `./reports/dailyAverage/${today}-score.json`,
    JSON.stringify(averages, null, 2)
  );
};

const moveFiles = async () => {
  const fileNames = await readDir('./reports/');

  const filteredFileList = fileNames.filter((fileName) => {
    if (
      !fileName.includes(today) &&
      fileName !== 'dailyAverage' &&
      fileName !== 'lastSavedReport.json' &&
      (fileName.includes('.json') || fileName.includes('.csv'))
    ) {
      return fileName;
    }
  });

  if (filteredFileList.length) {
    const dir = await exists(`./reports/${yesterday}`);
    console.log(dir);
    if (!dir) {
      await makeDir(`./reports/${yesterday}`, { recursive: true });
    }

    filteredFileList.map(async (file) => {
      return await rename(
        `./reports/${file}`,
        `./reports/${yesterday}/${file}`
      );
    });
  }
};

const makeSubFolders = async (date) => {
  const fileNames = await readDir(`./reports/${date}`);

  // const filteredFileList = fileNames.filter(dir => dir === date)

  if (fileNames.length) {
    const CSVdir = await exists(`./reports/${date}/csv`);
    const JSONdir = await exists(`./reports/${date}/json`);

    if (!CSVdir) {
      await makeDir(`./reports/${date}/csv`, { recursive: true });
    }

    if (!JSONdir) {
      await makeDir(`./reports/${date}/json`, { recursive: true });
    }

    fileNames.map(async (file) => {
      if (file.includes(`.json`)) {
        return await rename(
          `./reports/${date}/${file}`,
          `./reports/${date}/json/${file}`
        );
      }

      if (file.includes(`.csv`)) {
        return await rename(
          `./reports/${date}/${file}`,
          `./reports/${date}/csv/${file}`
        );
      }

      return file;
    });
  }
};

const run = async () => {
  await saveToDb();
  await writeAvgs();
  await moveFiles();
  await makeSubFolders(yesterday);
};

run();
