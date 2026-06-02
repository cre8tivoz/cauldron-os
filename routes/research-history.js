/**
 * routes/research-history.js
 * Route handlers for research history.
 */


const { normaliseLimitOffset, sendMarkdownDownload } = require("./_helpers");

function registerResearchHistoryRoutes(app, deps) {
  const {
    db, TEMPLATES, DESIGN_SYSTEMS, workspace, designSystemCache,
    getSystemPrompt, getTemplate, formatTemplateForPrompt, ensureDesignSystem,
    CLARIFY_SYSTEM_PROMPT, CLARIFY_NUM_PREDICT, BLUEPRINT_NUM_PREDICT,
    OLLAMA_BASE_URL, OLLAMA_TAGS_URL, CLOUD_TIMEOUT_MS,
    activeBuildControllers, buildSessions,
    safeProjectName, getProjectPath, buildResumePrompt, buildOpencodeArgs,
    commandPreview, listImportableProjects, getBuildStatus,
    callOllamaModel, callCloudModel, getCloudModelName,
    extractJsonObject, normaliseClarifyResult,
    scrapeURLFast, scrapeRenderedURL, formatResearchForPrompt,
    inferProviderFromModel,
  } = deps;

  app.get('/api/research-history', (req, res) => {
    try {
      const { limit, offset } = normaliseLimitOffset(req.query);
      const research = db.getResearchHistory({
        limit,
        offset,
        q: req.query.q || '',
        favoriteOnly: req.query.favorite === '1' || req.query.favorite === 'true',
      });
      res.json({ success: true, research, total: db.countResearchHistory() });
    } catch (err) {
      console.error('[Cauldron] Research history error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch research history', details: err.message });
    }
  });

  app.post('/api/research-history/:id/favorite', (req, res) => {
    try {
      const ok = db.setResearchFavorite(req.params.id, req.body.favorite !== false);
      if (!ok) return res.status(404).json({ success: false, error: 'Research record not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[Cauldron] Research favorite error:', err);
      res.status(500).json({ success: false, error: 'Failed to update research favorite', details: err.message });
    }
  });
}

module.exports = registerResearchHistoryRoutes;
