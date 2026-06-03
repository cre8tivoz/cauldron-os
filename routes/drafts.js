/**
 * routes/drafts.js
 * Route handlers for drafts.
 */


const { normaliseLimitOffset, sendMarkdownDownload } = require("./_helpers");

function registerDraftsRoutes(app, deps) {
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

  app.get('/api/drafts', (req, res) => {
    try {
      const { limit, offset } = normaliseLimitOffset(req.query);
      const drafts = db.getAllDrafts(limit, offset, req.query.q || '');
      res.json({ success: true, drafts, total: db.countDrafts() });
    } catch (err) {
      console.error('[Cauldron] Draft list error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch drafts', details: err.message });
    }
  });

  app.post('/api/drafts', (req, res) => {
    try {
      const {
        projectName,
        brainDump = '',
        blueprint,
        designReference = 'none',
        generationMode = 'local',
        modelUsed = null,
        prototypeHtml = '',
        prototypeIterations = [],
      } = req.body;
      if (!projectName || !blueprint) {
        return res.status(400).json({ success: false, error: 'projectName and blueprint are required' });
      }

      const result = db.createDraft({
        projectName,
        brainDump,
        blueprint,
        designReference,
        generationMode,
        modelUsed,
        prototypeHtml,
        prototypeIterations,
      });
      db.createSession({
        sessionId: req.headers['x-session-id'] || db.generateSessionId(),
        brainDump,
        designReference,
        generationMode,
        modelUsed,
        draftId: result.id,
      });

      res.json({ success: true, draftId: result.id, filename: result.filename });
    } catch (err) {
      console.error('[Cauldron] Save draft error:', err);
      res.status(500).json({ success: false, error: 'Failed to save draft', details: err.message });
    }
  });

  app.get('/api/drafts/:id', (req, res) => {
    try {
      const draft = db.getDraftById(req.params.id);
      if (!draft) return res.status(404).json({ success: false, error: 'Draft not found' });
      res.json({ success: true, draft });
    } catch (err) {
      console.error('[Cauldron] Draft fetch error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch draft', details: err.message });
    }
  });

  app.get('/api/drafts/:id/export.md', (req, res) => {
    try {
      const draft = db.getDraftById(req.params.id);
      if (!draft) return res.status(404).json({ success: false, error: 'Draft not found' });
      const safeName = String(draft.project_name || 'cauldron-draft').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cauldron-draft';
      sendMarkdownDownload(res, `${safeName}.md`, draft.blueprint || '');
    } catch (err) {
      console.error('[Cauldron] Draft export error:', err);
      res.status(500).json({ success: false, error: 'Failed to export draft', details: err.message });
    }
  });

  app.delete('/api/drafts/:id', (req, res) => {
    try {
      const ok = db.deleteDraft(req.params.id);
      if (!ok) return res.status(404).json({ success: false, error: 'Draft not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('[Cauldron] Delete draft error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete draft', details: err.message });
    }
  });
}

module.exports = registerDraftsRoutes;
