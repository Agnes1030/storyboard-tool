function buildGeneratePrompt({ genre, theme, characters, tone, scenes }) {
  const charDesc = characters?.length
    ? `主要角色：${characters.map((character) => `${character.name}（${character.role}，${character.appearance || '外貌未设定'}）`).join('、')}`
    : '';

  return `你是一位专业漫画/短剧剧本作家，擅长写节奏感强、画面感丰富的漫剧剧本。

请根据以下设定，创作一段完整的剧本：

【类型】${genre || '现代都市'}
【主题/核心冲突】${theme || '未指定'}
【基调】${tone || '紧张悬疑'}
【场数】${scenes || 2} 场
${charDesc}

要求：
- 每场开头注明【第X场】、地点、时间、氛围
- 人物对白用"角色名：台词"格式
- 动作描述用括号（）标注
- 画面感强，适合漫画分镜
- 对白简练有力，不超过20字一句
- 直接输出剧本正文，不要任何说明`;
}

function buildContinuePrompt({ existingScript }) {
  return `你是专业漫画剧本作家。请根据已有剧本，续写下一场内容。

【已有剧本】
${existingScript}

要求：
- 延续前文的人物关系、情绪和节奏
- 续写 1-2 场，格式保持一致
- 画面感强，对白简练
- 直接输出续写内容，不要说明`;
}

function buildPolishPrompt({ existingScript, instruction }) {
  return `你是专业漫画剧本编辑。请对以下剧本进行润色优化。

【原始剧本】
${existingScript}

【优化要求】${instruction || '提升对白张力，加强画面感，优化节奏'}

要求：
- 保持原有故事结构和人物关系
- 对白更加简练有力
- 场景描述更具画面感
- 直接输出优化后的完整剧本，不要说明`;
}

function buildOutlinePrompt({ genre, theme, characters, tone, scenes }) {
  return `你是专业漫画剧本策划。请根据以下信息，创作一个剧本大纲。

【类型】${genre || '现代都市'}
【主题】${theme || '未指定'}
【基调】${tone || '紧张悬疑'}
${characters?.length ? `【角色】${characters.map((character) => `${character.name}（${character.role}）`).join('、')}` : ''}

请输出：
1. 故事核心矛盾（1-2句）
2. 人物关系图（文字版）
3. 分场大纲（每场一句话概括，共${scenes || 4}场）
4. 高潮设计
5. 结局方向（开放/封闭各一个方案）

直接输出内容，不要多余说明。`;
}

function buildWritePrompt(payload) {
  if (payload.mode === 'generate') return buildGeneratePrompt(payload);
  if (payload.mode === 'continue') return buildContinuePrompt(payload);
  if (payload.mode === 'polish') return buildPolishPrompt(payload);
  if (payload.mode === 'outline') return buildOutlinePrompt(payload);
  throw new Error('不支持的剧本创作模式');
}

module.exports = {
  buildGeneratePrompt,
  buildContinuePrompt,
  buildPolishPrompt,
  buildOutlinePrompt,
  buildWritePrompt,
};
