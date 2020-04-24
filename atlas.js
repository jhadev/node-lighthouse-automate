const sh = require('shelljs');
require('dotenv').config();

const sendToAtlas = (date) => {
  const importToDb = `mongoimport --uri "${process.env.MONGO_CONNECT}" --collection averages --file .//reports/dailyAverage/${date}-score.json`;
  sh.exec(importToDb, (code, output) => {
    console.log(output);
  });
};

sendToAtlas('2020-04-19');
