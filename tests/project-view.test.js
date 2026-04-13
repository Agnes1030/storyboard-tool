const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const projectView = require(path.join(rootDir, 'app', 'web', 'project-view.js'));

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Server did not become ready for ${url}`);
}

test('createStatBarData summarizes current storyboard state', () => {
  const data = projectView.createStatBarData({
    sceneTitle: '雨夜追逐',
    shots: [{ shot_num: 1 }, { shot_num: 2 }, { shot_num: 3 }],
    characters: [
      { id: 1, name: '林夏', appearance: '黑色短发' },
      { id: 2, name: '周沉', appearance: '' },
      { id: 3, name: '', appearance: '风衣' },
    ],
  });

  assert.deepEqual(data, {
    sceneTitle: '雨夜追逐',
    totalShots: 3,
    injectedCharacterCount: 1,
    modelLabel: 'Groq · llama-3.3-70b',
  });
});

test('createShotRowData and createShotCardData prepare shot display fields', () => {
  const shot = {
    shot_num: 7,
    shot_type: '近景',
    camera_move: '',
    emotion: '紧张不安',
    characters: '林夏, 周沉',
    visual_desc: '雨夜巷口对峙',
    dialogue: '别再靠近了。',
    bg_atmosphere: '霓虹映在积水上',
  };

  const rowData = projectView.createShotRowData(shot, '赛博朋克');
  const cardData = projectView.createShotCardData(shot, '赛博朋克');

  assert.deepEqual(rowData, {
    shotLabel: 'S07',
    shotType: '近景',
    cameraMove: '固定',
    emotion: '紧张不安',
    emotionColor: '#dc2626',
    characters: '林夏, 周沉',
    visualDesc: '雨夜巷口对峙',
    dialogue: '别再靠近了。',
    backgroundAtmosphere: '霓虹映在积水上',
    prompt: '雨夜巷口对峙，霓虹映在积水上，近景构图，赛博朋克，高质量，细节丰富，漫画分镜',
    encodedPrompt: encodeURIComponent('雨夜巷口对峙，霓虹映在积水上，近景构图，赛博朋克，高质量，细节丰富，漫画分镜'),
  });

  assert.deepEqual(cardData, {
    shotLabel: 'S07',
    shotType: '近景',
    cameraMove: '固定',
    emotion: '紧张不安',
    emotionColor: '#dc2626',
    characters: '林夏, 周沉',
    visualDesc: '雨夜巷口对峙',
    dialogue: '别再靠近了。',
    backgroundAtmosphere: '霓虹映在积水上',
    prompt: '雨夜巷口对峙，霓虹映在积水上，近景构图，赛博朋克，高质量，细节丰富，漫画分镜',
    promptPreview: '雨夜巷口对峙，霓虹映在积水上，近景构图，赛博朋克，高质量，细节丰富，漫画分镜',
    encodedPrompt: encodeURIComponent('雨夜巷口对峙，霓虹映在积水上，近景构图，赛博朋克，高质量，细节丰富，漫画分镜'),
  });
});

test('createShotCardData truncates long prompt previews and createRhythmBarData maps rhythm bars', () => {
  const longShot = {
    shot_num: 12,
    emotion: '高潮时刻',
    visual_desc: '主角在天台边缘回头凝视远处不断逼近的警灯、无人机编队与翻涌云层，身后广告屏碎光映亮浸透雨水的外套与颤抖的手指',
    bg_atmosphere: '暴雨、红蓝警灯、风声撕裂夜空、城市霓虹在积水与玻璃幕墙上层层反射',
    shot_type: '大全景',
  };

  const cardData = projectView.createShotCardData(longShot, '写实风格');
  const rhythmData = projectView.createRhythmBarData([
    { shot_num: 1, emotion: '温馨片刻' },
    { shot_num: 12, emotion: '高潮时刻' },
    { shot_num: 3, emotion: '未知情绪' },
  ]);

  assert.equal(cardData.prompt.length > 80, true);
  assert.equal(cardData.promptPreview, `${cardData.prompt.slice(0, 80)}…`);

  assert.deepEqual(rhythmData, [
    {
      shotLabel: 'S1',
      title: 'S01 · 温馨片刻',
      height: 18,
      color: '#1D9E75',
      emotion: '温馨片刻',
    },
    {
      shotLabel: 'S12',
      title: 'S12 · 高潮时刻',
      height: 44,
      color: '#dc2626',
      emotion: '高潮时刻',
    },
    {
      shotLabel: 'S3',
      title: 'S03 · 未知情绪',
      height: 9,
      color: '#9ca3af',
      emotion: '未知情绪',
    },
  ]);
});

test('GET /project-view.js serves the browser project view helper asset', async () => {
  const port = 3109;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-view-asset-'));
  const dataRoot = path.join(tempRoot, 'data');
  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const assetResponse = await fetch(`http://127.0.0.1:${port}/project-view.js`);
    const assetScript = await assetResponse.text();
    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    const html = await pageResponse.text();

    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get('content-type') || '', /application\/javascript/);
    assert.match(assetScript, /window\.ProjectView\s*=\s*projectViewApi/);
    assert.match(assetScript, /createStatBarData/);
    assert.match(assetScript, /createShotRowData/);
    assert.match(assetScript, /createShotCardData/);
    assert.match(assetScript, /createRhythmBarData/);

    assert.equal(pageResponse.status, 200);
    assert.match(html, /<script src="\/project-view\.js"><\/script>/);
    assert.match(html, /window\.ProjectView/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
