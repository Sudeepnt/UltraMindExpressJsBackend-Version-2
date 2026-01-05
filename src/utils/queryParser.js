 const chrono = require('chrono-node');

function parseQuery(queryText, referenceDate) {
  if (!queryText || queryText.trim() === '') {
    return {
      originalQuery: '',
      semanticQuery: '',
      timeFilter: null,
      hasTimeFilter: false
    };
  }

  const now = referenceDate ? new Date(referenceDate).getTime() : Date.now();
  let timeFilter = null;
  let cleanedQuery = queryText;

  const baseDate = referenceDate ? new Date(referenceDate) : new Date();
  const parsed = chrono.parse(queryText, baseDate);

  if (parsed.length > 0) {
    const timeExpression = parsed[0];
    const timePhrase = timeExpression.text;
    const parsedDate = timeExpression.start.date();

    const startTimestamp = parsedDate.getTime();
    const endTimestamp = now;

    timeFilter = {
      start: startTimestamp,
      end: endTimestamp,
      phrase: timePhrase
    };

    cleanedQuery = queryText.replace(timePhrase, '').trim();
  }

  const semanticQuery = cleanedQuery.trim();

  return {
    originalQuery: queryText,
    semanticQuery,
    timeFilter,
    hasTimeFilter: timeFilter !== null
  };
}

module.exports = { parseQuery };

