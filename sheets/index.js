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

const manageSheets = async () => {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  await doc.useServiceAccountAuth(creds);

  // or preferably, loading that info from env vars / config instead of the file
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  await doc.loadInfo(); // loads document properties and worksheets
  // FIXME: this is just testing
  const sheet = await doc.addSheet({ headerValues: ['date', 'url', 'score'] });
  const data = await parseJSON(today);
  const { date, url, score } = data;
  sheet.addRow({ date, url, score });
};

manageSheets();
