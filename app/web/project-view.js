const storyboardViewApi = typeof window !== 'undefined'
  ? window.StoryboardView
  : require('./storyboard-view');

const { buildDrawingPrompt, getEmoColor, getEmoIntensity } = storyboardViewApi;

function formatShotLabel(shotNum) {
  return `S${String(shotNum || 0).padStart(2, '0')}`;
}

function createStatBarData({ sceneTitle, shots = [], characters = [] } = {}) {
  return {
    sceneTitle: sceneTitle || '未命名',
    totalShots: shots.length,
    injectedCharacterCount: characters.filter((character) => character.name && character.appearance).length,
    modelLabel: 'Groq · llama-3.3-70b',
  };
}

function createShotRowData(shot = {}, style) {
  const prompt = buildDrawingPrompt(shot, style);

  return {
    shotLabel: formatShotLabel(shot.shot_num),
    shotType: shot.shot_type || '-',
    cameraMove: shot.camera_move || '固定',
    emotion: shot.emotion || '-',
    emotionColor: getEmoColor(shot.emotion),
    characters: shot.characters || '',
    visualDesc: shot.visual_desc || '-',
    dialogue: shot.dialogue || '',
    backgroundAtmosphere: shot.bg_atmosphere || '-',
    prompt,
    encodedPrompt: encodeURIComponent(prompt),
  };
}

function createShotCardData(shot = {}, style) {
  const rowData = createShotRowData(shot, style);

  return {
    ...rowData,
    promptPreview: rowData.prompt.length > 80 ? `${rowData.prompt.slice(0, 80)}…` : rowData.prompt,
  };
}

function createRhythmBarData(shots = []) {
  const maxHeight = 44;

  return shots.map((shot = {}) => {
    const emotion = shot.emotion || '中立';
    const intensity = getEmoIntensity(shot.emotion);

    return {
      shotLabel: `S${shot.shot_num || 0}`,
      title: `${formatShotLabel(shot.shot_num)} · ${emotion}`,
      height: Math.max(8, Math.round((intensity / 5) * maxHeight)),
      color: getEmoColor(shot.emotion),
      emotion: shot.emotion || '未知情绪',
    };
  });
}

const projectViewApi = {
  createStatBarData,
  createShotRowData,
  createShotCardData,
  createRhythmBarData,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = projectViewApi;
}

if (typeof window !== 'undefined') {
  window.ProjectView = projectViewApi;
}
