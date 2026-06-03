/**
 * routes/templates.js
 * Public interfaces:
 * - GET /api/templates: scaffold/template metadata.
 * - GET /api/build-status: aggregate generated-project status.
 */


const { normaliseLimitOffset, sendMarkdownDownload } = require("./_helpers");

function registerTemplatesRoutes(app, deps) {
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
