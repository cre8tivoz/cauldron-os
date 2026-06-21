/**
 * routes/templates.js
 * Public interfaces:
 * - GET /api/templates: scaffold/template metadata.
 * - GET /api/build-status: aggregate generated-project status.
 */




function registerTemplatesRoutes(app, deps) {
  const { TEMPLATES, getBuildStatus } = deps;

  app.get('/api/templates', (req, res) => {
    res.json({ success: true, defaultTemplateId: 'html-alpine', templates: TEMPLATES });
  });

  app.get('/api/build-status', (req, res) => {
    try {
      res.json({ success: true, ...getBuildStatus() });
    } catch (err) {
      console.error('[Cauldron] Build status error:', err);
      res.status(500).json({ success: false, error: 'Build status failed', details: err.message });
    }
  });
}

module.exports = registerTemplatesRoutes;
