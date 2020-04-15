const fs = require('fs');
const { promisify } = require('util');
const { spawn, exec } = require('child_process');
const sh = require('shelljs');
require('dotenv').config();

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
let count = 0;

let now = Date.now();

const command = `lighthouse ${process.env.URL} --extra-headers=./headers.json --output json --output-path ./reports/report-${now}.json --chrome-flags="--headless" --save-assets`;

const importIntoMongo = `mongoimport --jsonArray -d lighthouse-automation -c data --file .//reports/lastSavedReport.json`;

const runLighthouse = () => {
  return new Promise((resolve, reject) => {
    sh.exec(command, (code, output) => {
      console.log(output);
      resolve();
    });
  });
};

const saveToMongo = async () => {
  count += 1;
  await runLighthouse();
  const path = `./reports/report-${now}.json`;
  let data = await read(path, 'utf8');
  data = [JSON.parse(data)];

  await write('./reports/lastSavedReport.json', JSON.stringify(data));
  sh.exec(importIntoMongo, (code, output) => {
    if (count === 2) {
      console.log('done', count);
      return clearInterval(interval);
    }
    console.log(output);
  });
};

const interval = setInterval(saveToMongo, 1200000);
saveToMongo();
