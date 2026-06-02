/**
 * routes/_helpers.js
 * Shared route helpers extracted from server.js.
 */

function normaliseLimitOffset(query) {
  return {
    limit: Math.min(Math.max(Number(query.limit) || 50, 1), 200),
    offset: Math.max(Number(query.offset) || 0, 0),
  };
}

function sendMarkdownDownload(res, filename, markdown) {
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(markdown);
}

module.exports = { normaliseLimitOffset, sendMarkdownDownload };
