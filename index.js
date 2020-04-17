const fs = require('fs');
// turn callbacks into promises
const { promisify } = require('util');
// execute shell commands
const sh = require('shelljs');
const moment = require('moment')
require('dotenv').config();

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const readDir = promisify(fs.readdir)

// TODO: fix file name structure
let now = moment().format('YYYY-MM-DD-HH-MM-ss');
console.log(now)
let today = moment().format('YYYY-MM-DD')
console.log(today)

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
  await write('./reports/lastSavedReport.json', JSON.stringify(data));
  // import into mongo
  sh.exec(importToDb, (code, output) => {
    console.log(output);
  });
};

const getFile = async fileName => {
  await read(`./reports/${fileName}`, 'utf8')
}

const isFileFromToday = fileName => {
  if (fileName.includes(today) && fileName.includes('.report.json')) {
    return fileName
  }

  return false
}

const getFilesForToday = async () => {
  const fileNames = await readDir('./reports/')
  
  console.log(fileNames)
  const onlyToday = fileNames.filter(isFileFromToday)

  console.log(onlyToday)
  return Promise.all(onlyToday.map(async file => {
    return await read(`./reports/${file}`, 'utf8')
  }))
}

const getKeyMetrics = async () => {
  const files = await getFilesForToday()

  const onlyKeyMetrics = files.map(file => {
    file = JSON.parse(file)
    return {
      userAgent: file.userAgent,
      fetchTime: file.fetchTime,
      url: file.finalUrl,
      firstMeaningfulPaint: file.audits['first-meaningful-paint'],
      firstContentfulPaint: file.audits['first-contentful-paint'],
      speedIndex: file.audits['speed-index'],
      interactive: file.audits['interactive'],
      firstCPUIdle: file.audits['first-cpu-idle']
    }
  })

  console.log(onlyKeyMetrics)
  const totalItems = onlyKeyMetrics.length
  const sums = onlyKeyMetrics.reduce((total, next) => {
    
    return {
      date: today,
      url: next.url,
      firstMeaningfulPaint: (total.firstMeaningfulPaint + next.firstMeaningfulPaint.score),
      firstContentfulPaint: (total.firstContentfulPaint + next.firstContentfulPaint.score),
      speedIndex: (total.speedIndex + next.speedIndex.score),
      interactive: (total.interactive + next.interactive.score),
      firstCPUIdle: (total.firstCPUIdle + next.firstCPUIdle.score)
    }
  }, {
    date: today,
    url: '',
    firstContentfulPaint: 0,
    firstMeaningfulPaint: 0,
    speedIndex: 0,
    interactive: 0,
    firstCPUIdle: 0
  })

  // const averages = Object.entries(sums).map(([key, value]) => {
  //   if (typeof value === 'number') {
  //     key = key / totalItems
  //   }

  //   return [key]: value
  // })

  const averages = {
    ...sums,
    firstContentfulPaint: sums.firstContentfulPaint / totalItems,
    firstMeaningfulPaint: sums.firstMeaningfulPaint / totalItems,
    speedIndex: sums.speedIndex / totalItems,
    interactive: sums.interactive / totalItems,
    firstCPUIdle: sums.firstCPUIdle / totalItems
  }

  console.log(averages)
  


}

saveToDb().then(() => getKeyMetrics());
