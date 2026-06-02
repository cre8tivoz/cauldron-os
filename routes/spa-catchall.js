/**
 * routes/spa-catchall.js
 * SPA catch-all route — serves index.html for all unmatched routes.
 */

const path = require("path");

function registerSpaCatchallRoutes(app, deps) {
  app.use((req, res) => {
    res.sendFile(path.join(deps.rootDir, 'public', 'index.html'));
  });
}

module.exports = registerSpaCatchallRoutes;
