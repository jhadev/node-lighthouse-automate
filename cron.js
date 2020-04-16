const cron = require('node-cron');
const sh = require('shelljs');

cron.schedule('*/20 * * * *', () => {
  sh.exec('node index.js', (code, output) => {
    console.log(output);
  });
});
