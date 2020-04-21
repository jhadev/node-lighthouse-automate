const createAvgObj = (sums, totalItems) => {
  return {
    ...sums,
    reportsTotal: totalItems,
    score: sums.score / totalItems,
    firstMeaningfulPaint: {
      score: sums.firstMeaningfulPaint.score / totalItems,
      numericValue: sums.firstMeaningfulPaint.numericValue / totalItems,
    },
    firstContentfulPaint: {
      score: sums.firstContentfulPaint.score / totalItems,
      numericValue: sums.firstContentfulPaint.numericValue / totalItems,
    },
    speedIndex: {
      score: sums.speedIndex.score / totalItems,
      numericValue: sums.speedIndex.numericValue / totalItems,
    },
    interactive: {
      score: sums.interactive.score / totalItems,
      numericValue: sums.interactive.numericValue / totalItems,
    },
    firstCPUIdle: {
      score: sums.firstCPUIdle.score / totalItems,
      numericValue: sums.firstCPUIdle.numericValue / totalItems,
    },
  };
};

const getAvgScores = (arr, date) => {
  const initialValue = {
    date,
    url: '',
    score: 0,
    firstContentfulPaint: { score: 0, numericValue: 0 },
    firstMeaningfulPaint: { score: 0, numericValue: 0 },
    speedIndex: { score: 0, numericValue: 0 },
    interactive: { score: 0, numericValue: 0 },
    firstCPUIdle: { score: 0, numericValue: 0 },
  };
  // TODO: refactor
  const sums = arr.reduce((total, next) => {
    return {
      date,
      url: next.url,
      score: total.score + next.score,
      firstMeaningfulPaint: {
        score:
          total.firstMeaningfulPaint.score + next.firstMeaningfulPaint.score,
        numericValue:
          total.firstMeaningfulPaint.numericValue +
          next.firstMeaningfulPaint.numericValue,
      },
      firstContentfulPaint: {
        score:
          total.firstContentfulPaint.score + next.firstContentfulPaint.score,
        numericValue:
          total.firstContentfulPaint.numericValue +
          next.firstContentfulPaint.numericValue,
      },
      speedIndex: {
        score: total.speedIndex.score + next.speedIndex.score,
        numericValue:
          total.speedIndex.numericValue + next.speedIndex.numericValue,
      },
      interactive: {
        score: total.interactive.score + next.interactive.score,
        numericValue:
          total.interactive.numericValue + next.interactive.numericValue,
      },
      firstCPUIdle: {
        score: total.firstCPUIdle.score + next.firstCPUIdle.score,
        numericValue:
          total.firstCPUIdle.numericValue + next.firstCPUIdle.numericValue,
      },
    };
  }, initialValue);

  return sums;
};

module.exports = {
  createAvgObj,
  getAvgScores,
};
