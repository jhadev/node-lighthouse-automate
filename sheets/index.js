const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();
const creds = require('./google-creds.json'); // the file saved above

const manageSheets = async () => {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  await doc.useServiceAccountAuth(creds);

  // or preferably, loading that info from env vars / config instead of the file
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  await doc.loadInfo(); // loads document properties and worksheets
  console.log(doc.title);
  await doc.updateProperties({ title: 'renamed doc' });

  const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
  console.log(sheet.title);
  console.log(sheet.rowCount);

  // adding / removing sheets
  await doc.addSheet({ title: 'hot new sheet!' });
};

manageSheets();
