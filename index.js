const fs = require('fs');
const { promisify } = require('util');
const sh = require('shelljs');
require('dotenv').config();

const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);

let now = Date.now();

const command = `lighthouse ${process.env.URL} --output json --output-path ./reports/report-${now}.json --chrome-flags="--headless" --save-assets`;

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
  await runLighthouse();
  const path = `./reports/report-${now}.json`;
  let data = await read(path, 'utf8');
  data = [JSON.parse(data)];

  await write('./reports/lastSavedReport.json', JSON.stringify(data));
  sh.exec(importIntoMongo, (code, output) => {
    console.log(output);
  });
};

saveToMongo();
