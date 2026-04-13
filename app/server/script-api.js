const { buildWritePrompt } = require('../core/script-model');

async function handlePostWrite(res, payload, dependencies = {}) {
  const buildPrompt = dependencies.buildPrompt || buildWritePrompt;
  const callAi = dependencies.callAi;
  const prompt = buildPrompt(payload);

  console.log('[write] mode:', payload.mode);
  const text = await callAi([{ role: 'user', content: prompt }], 2000, 0.8);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ text }));
}

module.exports = {
  handlePostWrite,
};
