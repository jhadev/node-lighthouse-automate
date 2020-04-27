const cron = require('node-cron');
const sh = require('shelljs');

cron.schedule('*/20 * * * *', () => {
  console.log('running node index.js every 20 mins');
  sh.exec('node index.js', (code, output) => {
    console.log(output);
  });
});

cron.schedule('10 0 * * *', () => {
  console.log('running atlas.js at 12:10am');
  sh.exec('node atlas.js', (code, output) => {
    console.log(output);
  });
});

cron.schedule('16 0 * * *', () => {
  console.log('running sheets/index.js at 12:16am');
  sh.exec('node sheets/index.js', (code, output) => {
    console.log(output);
  });
});
