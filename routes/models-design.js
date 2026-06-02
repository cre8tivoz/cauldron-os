/**
 * routes/models-design.js
 * Route handlers for models design.
 */


const { normaliseLimitOffset, sendMarkdownDownload } = require("./_helpers");

function registerModelsDesignRoutes(app, deps) {
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
    inferProviderFromModel, CLOUD_MODELS,
  } = deps;

  app.get('/api/cloud-models', (req, res) => {
    res.json({ success: true, providers: CLOUD_MODELS });
  });

  app.get('/api/ollama-models', async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(OLLAMA_TAGS_URL, { signal: controller.signal });
      if (!response.ok) throw new Error(`Ollama ${response.status}`);
      const data = await response.json();
      const models = Array.isArray(data.models)
        ? data.models.map(model => ({
            name: model.name,
            label: model.name,
            size: model.size || null,
            modifiedAt: model.modified_at || null,
          })).filter(model => model.name)
        : [];
      res.json({ success: true, baseUrl: OLLAMA_BASE_URL, models });
    } catch (err) {
      res.status(503).json({ success: false, baseUrl: OLLAMA_BASE_URL, models: [], error: 'Unable to detect Ollama models', details: err.message });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get('/api/design-systems', (req, res) => {
    const list = Object.entries(DESIGN_SYSTEMS)
      .filter(([key]) => key !== 'none')
      .map(([key, val]) => ({ id: key, name: val.name }));
    res.json({ systems: list });
  });

  app.post('/api/design-reference', async (req, res) => {
    const { system } = req.body;
  
    if (!system || !DESIGN_SYSTEMS[system]) {
      return res.status(400).json({ error: 'Invalid design system' });
    }
  
    if (designSystemCache.has(system)) {
      return res.json({ cached: true, system });
    }
  
    const { repo, path: filePath } = DESIGN_SYSTEMS[system];
    if (!repo) {
      return res.json({ cached: false, system, content: '' });
    }
  
    fetchDesignSystem(repo, (err, content) => {
      if (err) {
        console.error(`Failed to fetch ${repo}:`, err.message);
        return res.status(500).json({ error: `Failed to fetch design system: ${err.message}` });
      }
    
      designSystemCache.set(system, content);
      res.json({ cached: false, system, content });
    });
  });
}

module.exports = registerModelsDesignRoutes;
