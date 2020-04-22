const fs = require('fs');
const { promisify } = require('util');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
require('dotenv').config();
const creds = require('./google-creds.json'); // the file saved above

let today = moment().format('YYYY-MM-DD');

const readFile = promisify(fs.readFile);

const parseJSON = async (date) => {
  const path = `./reports/dailyAverage/${date}-score.json`;
  let data = await readFile(path);
  return JSON.parse(data);
};

const mapData = (obj) => {
  const arr = [obj];
  const mapped = arr.map((data) => {
    return {
      date: data.date,
      url: data.url,
      score: data.score,
      firstMeaningfulPaint: data.firstMeaningfulPaint.numericValue,
      firstContentfulPaint: data.firstContentfulPaint.numericValue,
      speedIndex: data.speedIndex.numericValue,
      interactive: data.interactive.numericValue,
      firstCPUIdle: data.firstCPUIdle.numericValue,
      reportsTotal: data.reportsTotal,
    };
  });

  return mapped[0];
};

const manageSheets = async (title) => {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  await doc.useServiceAccountAuth(creds);

  // or preferably, loading that info from env vars / config instead of the file
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });
  await doc.loadInfo(); // loads document properties and worksheets
  let sheet = doc.sheetsByIndex[1];
  // FIXME: this is just testing
  const data = await parseJSON(today);
  if (!sheet) {
    sheet = await doc.addSheet({ headerValues: Object.keys(data) });
  }
  const row = mapData(data);
  sheet.addRow(row);
};

manageSheets();
