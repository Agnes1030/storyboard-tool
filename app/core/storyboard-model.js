function buildStoryboardPrompt(script, style, shotPref, characters = []) {
  const charSection = characters.length > 0
    ? `【角色设定库】（生成分镜时严格遵守以下角色外貌描述，确保跨镜头一致性）
${characters.map(c =>
  `▸ ${c.name}（${c.age||''}岁，${c.gender||''}）
  外貌：${c.appearance||'未设定'}
  性格：${c.personality||'未设定'}
  标志性特征：${c.signature||'无'}`
).join('\n')}
` : '';

  return `你是一位专业漫画分镜导演，擅长将剧本转化为精准的分镜脚本。

【任务】将下方剧本分解为逐格分镜脚本，输出严格的 JSON 格式。

【画风要求】${style}
【景别偏好】${shotPref}
${charSection}
【输出格式】
只返回如下 JSON 对象，不要任何说明文字、不要 markdown 代码块：
{
  "scene_title": "场景标题",
  "total_shots": 数字,
  "shots": [
    {
      "shot_num": 1,
      "shot_type": "景别（全景/中景/近景/特写/航拍/俯拍/仰拍）",
      "camera_move": "运镜（固定/推/拉/摇/跟/变焦）",
      "emotion": "情绪标签（一个词：紧张/平静/对峙/压抑等）",
      "characters": "出场角色及动作描述（含外貌关键词，保持一致性）",
      "dialogue": "台词原文，无台词填空字符串",
      "visual_desc": "画面构图与视觉描述（60字内，供AI绘图使用，需含角色外貌关键词）",
      "bg_atmosphere": "背景与氛围（30字内）"
    }
  ]
}

严格要求：
1. 只输出 JSON，第一个字符必须是 {，最后一个字符必须是 }
2. 不要加任何前缀、说明或 markdown 标记
3. 情绪标签只用一个词
4. 台词保持原文
5. visual_desc 中必须包含角色外貌关键词

【剧本内容】
${script}`;
}

module.exports = {
  buildStoryboardPrompt,
};
