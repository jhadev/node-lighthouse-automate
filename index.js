const fs = require('fs');
// turn callbacks into promises
const { promisify } = require('util');
// execute shell commands
const sh = require('shelljs');
const moment = require('moment');
const { createAvgObj, getAvgScores } = require('./functions/helpers');
require('dotenv').config();

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const readDir = promisify(fs.readdir);
const exists = promisify(fs.exists);
const makeDir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

// TODO: fix file name structure
let now = moment().format('YYYY-MM-DD-HH-mm-ss');
console.log(now);
let today = moment().format('YYYY-MM-DD');
console.log(today);
let yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

const lighthouseCommand = `lighthouse ${process.env.URL} --extra-headers=./headers.json --output json --output csv --output-path=./reports/coach-${now}.json --chrome-flags="--headless"`;

const importToDb = `mongoimport --uri "${process.env.MONGO_CONNECT}" --jsonArray --collection data --file .//reports/lastSavedReport.json`;

// make sure lighthouse finishes before moving on to next task
const runLighthouse = (command) => {
  return new Promise((resolve, reject) => {
    sh.exec(command, (code, output) => {
      console.log(output);
      resolve();
    });
  });
};

const checkForError = async () => {
  const JSONpath = `./reports/coach-${now}.report.json`;
  const CSVpath = `./reports/coach-${now}.report.csv`;

  let data = await read(JSONpath, 'utf8');

  data = JSON.parse(data);

  if (data.runWarnings.length) {
    console.log(data.runWarnings.join(', '));
    await unlink(JSONpath);
    console.log(`DELETING - ${JSONpath}`);
    await unlink(CSVpath);
    console.log(`DELETING - ${CSVpath}`);
    return true;
  }

  return false;
};

const saveToDb = async () => {
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

const getKeyMetrics = async (callback) => {
  try {
    const files = await callback();

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

    const sums = getAvgScores(onlyKeyMetrics, today);

    const averages = createAvgObj(sums, totalItems);

    return averages;
  } catch (err) {
    console.log(err);
  }
};

const writeAvgs = async (keyMetricsFunc, whenFunc, date) => {
  const averages = await keyMetricsFunc(whenFunc);

  return await write(
    `./reports/dailyAverage/${date}-score.json`,
    JSON.stringify(averages, null, 2)
  );
};

const moveFiles = async (date) => {
  try {
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
      const dir = await exists(`./reports/${date}`);
      console.log(dir);
      if (!dir) {
        await makeDir(`./reports/${date}`, { recursive: true });
      }

      filteredFileList.map(async (file) => {
        return await rename(`./reports/${file}`, `./reports/${date}/${file}`);
      });
    }
  } catch (err) {
    console.log(err);
  }
};

const makeSubFolders = async (date) => {
  try {
    const isFolderPresent = await exists(`./reports/${date}`);

    if (!isFolderPresent) {
      return console.log('folder has not been created yet.');
    }

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
  } catch (err) {
    console.log(err);
  }
};

const run = async () => {
  // wait for lighthouse to finish
  await runLighthouse(lighthouseCommand);
  const isError = await checkForError();
  if (!isError) {
    await saveToDb();
    await writeAvgs(getKeyMetrics, getFilesForToday, today);
    await moveFiles(yesterday);
    await makeSubFolders(yesterday);
  }
};

run();
