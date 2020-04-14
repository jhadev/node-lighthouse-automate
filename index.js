const sh = require('shelljs');

const command = `lighthouse https://development-global-coach.demandware.net/on/demandware.store/Sites-Coach_US-Site --output json --output-path ./reports/report-${Date.now()}.json --chrome-flags="--headless" --save-assets`;

sh.exec(command, (code, output) => {
  console.log(output);
  // sh.echo(`exit code ${code}`);
});
