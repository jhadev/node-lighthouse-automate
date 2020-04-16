const fs = require('fs');
// turn callbacks into promises
const { promisify } = require('util');
// execute shell commands
const sh = require('shelljs');
require('dotenv').config();

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);

// TODO: fix file name structure
let now = Date.now();

const lighthouseCommand = `lighthouse ${process.env.URL} --extra-headers=./headers.json --output json --output csv --output-path=./reports/report-${now}.json --chrome-flags="--headless" --save-assets`;

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
  const path = `./reports/report-${now}.report.json`;
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

saveToDb();
