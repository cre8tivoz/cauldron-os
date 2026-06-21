/**
 * routes/status.js
 * Public interfaces:
 * - GET /api/health: service health response.
 */




function registerStatusRoutes(app, deps) {
  const { PACKAGE_VERSION } = deps;

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: `Cauldron OS v${PACKAGE_VERSION}` });
  });
}

module.exports = registerStatusRoutes;
