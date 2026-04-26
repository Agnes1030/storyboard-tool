const EMO_COLORS = {
  '紧张': '#dc2626',
  '对峙': '#dc2626',
  '愤怒': '#dc2626',
  '高潮': '#dc2626',
  '平静': '#1D9E75',
  '轻松': '#1D9E75',
  '温馨': '#1D9E75',
  '悲伤': '#378ADD',
  '压抑': '#378ADD',
  '失落': '#378ADD',
  '愉快': '#EF9F27',
  '惊讶': '#EF9F27',
  '疑惑': '#EF9F27',
  '中立': '#9ca3af',
};

const EMO_INTENSITY = {
  '紧张': 5,
  '对峙': 5,
  '愤怒': 5,
  '高潮': 5,
  '平静': 1,
  '轻松': 1,
  '温馨': 2,
  '悲伤': 3,
  '压抑': 4,
  '失落': 3,
  '愉快': 2,
  '惊讶': 4,
  '疑惑': 2,
  '中立': 1,
};

function buildDrawingPrompt(shot = {}, style) {
  const parts = [];

  if (shot.visual_desc) parts.push(shot.visual_desc);
  if (shot.bg_atmosphere) parts.push(shot.bg_atmosphere);
  if (shot.shot_type) parts.push(`${shot.shot_type}构图`);
  parts.push(style || '漫画风格');
  parts.push('高质量，细节丰富，漫画分镜');

  return parts.filter(Boolean).join('，');
}

function getMappedEmotionValue(emotion, mapping, fallbackValue) {
  for (const key of Object.keys(mapping)) {
    if (emotion && emotion.includes(key)) {
      return mapping[key];
    }
  }

  return fallbackValue;
}

function getEmoColor(emotion) {
  return getMappedEmotionValue(emotion, EMO_COLORS, '#9ca3af');
}

function getEmoIntensity(emotion) {
  return getMappedEmotionValue(emotion, EMO_INTENSITY, 1);
}

const storyboardViewApi = {
  buildDrawingPrompt,
  getEmoColor,
  getEmoIntensity,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = storyboardViewApi;
}

if (typeof window !== 'undefined') {
  window.StoryboardView = storyboardViewApi;
}
