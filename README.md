# 分镜AI — 本地部署说明

漫剧生成工具

## 环境要求
- Node.js 18+（运行 `node -v` 检查版本）
- Anthropic API Key（https://console.anthropic.com 获取）

## 快速启动

### 第一步：进入项目目录
```bash
cd storyboard-tool
```

### 第二步：启动服务（Mac / Linux）
```bash
ANTHROPIC_API_KEY=你的APIKey node server.js
```

### 第二步：启动服务（Windows CMD）
```cmd
set ANTHROPIC_API_KEY=你的APIKey
node server.js
```

### 第二步：启动服务（Windows PowerShell）
```powershell
$env:ANTHROPIC_API_KEY="你的APIKey"
node server.js
```

### 第三步：打开浏览器
访问 http://localhost:3000

---

## 使用方式
1. 粘贴剧本内容（建议 1-3 场）
2. 选择画风和景别偏好
3. 点击「生成分镜脚本」
4. 查看分镜表，可导出 TSV 文件（用 Excel 打开）

## 文件结构
```
storyboard-tool/
├── server.js          # 后端服务（含 Prompt 逻辑）
├── package.json
├── README.md
└── public/
    └── index.html     # 前端界面
```

## Prompt 调整
打开 `server.js`，找到 `buildPrompt()` 函数即可修改分析逻辑。
