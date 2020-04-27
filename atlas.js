const sh = require('shelljs');
const moment = require('moment');
require('dotenv').config();

const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

const sendToAtlas = (date) => {
  const importToDb = `mongoimport --uri "${process.env.MONGO_CONNECT}" --collection averages --file .//reports/dailyAverage/${date}-score.json`;
  sh.exec(importToDb, (code, output) => {
    console.log(output);
  });
};

sendToAtlas(yesterday);
