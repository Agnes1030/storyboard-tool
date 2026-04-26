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
├── .claude/
│   ├── context/        # Claude 协作上下文与规则
│   ├── memory/         # 协作记忆索引与记录
│   ├── plans/          # 计划文件
│   └── skills/         # 工作流技能占位定义
├── app/                # 迁移中的应用层骨架
├── data/
│   ├── presets/        # 运行时画风与景别预设
│   ├── projects/
│   │   └── default-project/
│   │       └── project.json
│   └── templates/      # 默认项目模板
├── docs/plans/         # 仓库重构计划
├── server.js           # 当前运行中的后端入口
└── public/
    └── index.html      # 当前运行中的前端入口
```

## 运行时数据布局
- 默认项目目录：`data/projects/default-project/`
- 默认项目持久化文件：`data/projects/default-project/project.json`
- `data/templates/default-project-template.json` 用于首次创建默认项目
- `app/` 目录当前仅提供迁移骨架，实际运行入口仍然是 `server.js` 和 `public/index.html`

## 迁移状态说明
- 本次仓库重构先建立目录契约与运行时数据布局，不在同一批次内迁移完整前端或后端逻辑。
- 最终验证步骤用于确认前序结构改动仍保持可运行状态，而不是引入新的结构层文件。
- 在完成后续迁移前，`server.js` 与 `public/index.html` 继续作为主入口，`.claude/`、`app/`、`data/` 则作为长期演进的目标结构。

## Prompt 调整
打开 `server.js`，找到 `buildStoryboardPrompt()` 函数即可修改分析逻辑。
