const { buildStoryboardPrompt } = require('../core/storyboard-model');

function sanitizeStoryboardResponse(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function handlePostAnalyze(res, payload, dependencies = {}) {
  const { script, style, shotPref, characters } = payload;
  const buildPrompt = dependencies.buildPrompt || buildStoryboardPrompt;
  const callAi = dependencies.callAi;
  const prompt = buildPrompt(script, style, shotPref, characters || []);

  console.log('[analyze] calling Groq...');
  let text = await callAi([{ role: 'user', content: prompt }], 2000, 0.3);
  console.log('[Groq] raw (first 300):', text.slice(0, 300));
  text = sanitizeStoryboardResponse(text);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
}

module.exports = {
  handlePostAnalyze,
  sanitizeStoryboardResponse,
};
