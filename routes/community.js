/**
 * routes/community.js
 * Public interfaces:
 * - GET /api/community: curated community design systems and scaffold starters.
 * - POST /api/community/import: import a community design system or template hint.
 */

const {
  importCommunityDesignSystem,
  listCommunityCatalog,
  templateToPromptTemplate,
  getCommunityTemplate,
} = require('../lib/community-catalog');

function registerCommunityRoutes(app, deps) {
  const { rootDir, DESIGN_SYSTEMS, designSystemCache } = deps;

  app.get('/api/community', (req, res) => {
    res.json(listCommunityCatalog());
  });

  app.post('/api/community/import', async (req, res) => {
    const type = String(req.body?.type || '').trim();
    const id = String(req.body?.id || '').trim();

    if (!id || !['design-system', 'template'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Provide type design-system or template with id' });
    }

    try {
      if (type === 'design-system') {
        const system = await importCommunityDesignSystem({ rootDir, id });
        DESIGN_SYSTEMS[system.id] = {
          name: system.name,
          repo: null,
          absolutePath: system.absolutePath,
          source: system.source,
          origin: system.origin,
        };
        designSystemCache.delete(system.id);
        return res.json({
          success: true,
          type,
          system: {
            id: system.id,
            name: system.name,
            source: system.source,
            origin: system.origin,
            importedAt: system.importedAt,
            fetched: system.fetched,
          },
        });
      }

      const item = getCommunityTemplate(id);
      if (!item) return res.status(404).json({ success: false, error: 'Unknown community template' });

      const template = templateToPromptTemplate(item);
      return res.json({ success: true, type, template });
    } catch (err) {
      const status = err.statusCode || 500;
      console.error('[Cauldron] Community import failed:', err.message);
      return res.status(status).json({ success: false, error: 'Community import failed', details: err.message });
    }
  });
}

module.exports = registerCommunityRoutes;
