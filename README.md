# Rhythm Fruit Aim / 节奏鲜果铺 Demo

这是一个可直接分享体验的 HTML 音游经营原型。当前实现仍以完整曲谱面为主，用来验证音游判定、谱面管线、练习/营业边界和店铺成长反馈；新的设计基线是“顾客故事 + 鲜果服务 + 节奏加工”。

当前版本把谱面制作工作流固定为：

```text
原始音频
-> Demucs v4 本地分轨，输出 stems/
-> MuG Diffusion 生成 3K osu!mania .osu 草稿
-> scripts/import_osu_mania.py 转换为 charts/<song>.json
-> tools/chart_editor.html 主观润色
-> scripts/sync_charts_to_game.py 同步到 HTML demo
```

当前游戏仍是单指玩法。3K 只代表画面上的三条视觉 lane：`-1 / 0 / 1`，不会改变输入方式。

## 如何体验

1. 保持本目录内文件结构不变。
2. 用任意静态服务器打开本目录。
3. 点击“开门营业”，选择歌曲和难度后开始测试当前原型。

当前试玩版运行时会加载 `charts/*.json`，请双击 `05_start_local_server.bat`，然后访问 `http://localhost:8080/`。

## 目录约定

- `audio/`：试玩版实际播放的音乐文件。
- `stems/`：Demucs 输出缓存，不是运行时资源。
- `imports/`：MuG Diffusion、osu!mania 编辑器等外部工具输出的草稿文件。
- `charts/`：唯一正式谱面源。每首歌一个 JSON 文件，`manifest.json` 负责索引。
- `index.html`：可分享试玩版入口，运行时从 `charts/` 加载正式谱面。
- `tools/chart_editor.html`：本地人工润色工具。
- `tools/schedule_editor.html`：日程叙事与序章对白编辑器；选择 `data/` 目录后可直接保存。
- `scripts/import_osu_mania.py`：把 3K `.osu` 草稿导入正式 JSON，并执行单指谱面筛查。
- `scripts/sync_charts_to_game.py`：刷新 `charts/manifest.json` 和 `index.html` 的歌曲元数据，不再清洗或回写正式谱面。

## 叙事编辑

- **对白风格锚点（序章关系戏与节度）**：[`docs/dialogue_style_benchmark_zh-CN.md`](docs/dialogue_style_benchmark_zh-CN.md)
- **总编辑层设定**：[`docs/story_bible_zh-CN.md`](docs/story_bible_zh-CN.md)。运行时序章对白以 `data/dialogue/prologue.json` 为准。打开 `tools/schedule_editor.html`，选择 `data/` 目录后，在「序章对白」Tab 中编辑 `opening`、服务成绩分支和共享后续；保存会写回 `data/dialogue/prologue.json`。
- `data/flows/*.json` 是日程 flow 的编辑格式，用于整理 Day 结构、对话、service、成绩分支和结算阶段。当前 HTML 运行时尚未完整解释这些 flow；如果要让 `day1.json` 等直接驱动游戏流程，需要后续接入 flow 解释器。
- 序章 `opening` 最后一条订单节点通常保留 `action: "startService"`；`afterService.shared` 最后一条系统节点通常保留 `action: "settlement"`，否则会影响服务曲与结算衔接。

## 推荐制谱流程

0. 把运行时音频统一为 m4a：

也可以双击 `00_convert_audio_to_m4a.bat`。它扫所有运行时音频（含 `.m4a`），按 `audio/loudness-manifest.json` 的记录跳过已归一化的文件，只处理新加或被外部覆盖过 hash 不一致的；处理完会重写 `charts/` 与 `index.html` 的音频引用。要全量重跑加 `--force`。

1. 把音乐放入 `audio/service/` 或 `audio/tracks/`，例如 `audio/tracks/drama.m4a`。只有这两个目录需要谱面。
2. 准备 MuG Diffusion 更稳的 WAV 输入：

也可以双击 `01_prepare_mug_inputs.bat`。

这会生成 `imports/<song-id>/mug/source.wav`，并打印每个难度应输出到哪里。

3. 在 MuG Diffusion Windows WebUI 中选择 4K VSRG / osu!mania 输出，使用对应 `source.wav` 生成 `.osu` 或 `.osz` 草稿，service 放入 `imports/lemon-water/mug/service.osz`，track 放入类似 `imports/drama/mug/expert.osz` 的路径。
4. 导入草稿，并自动执行单指规则筛查：

```powershell
python scripts\import_osu_mania.py imports\drama\mug\expert.osz --difficulty expert --audio-key audio/tracks/drama.m4a
```

批量导入 `audio/service` 与 `audio/tracks` 中所有需要谱面的音频：

```powershell
python scripts\import_all_osu_mania.py
```

批量导入默认会跳过已经存在的 `charts/service/*.json` 和 `charts/tracks/*.json`，避免覆盖人工润色过的谱面。只有明确要重导旧曲时才使用：

```powershell
python scripts\import_all_osu_mania.py --overwrite
```

批量脚本会寻找：

```text
imports/<song-id>/mug/easy.osu 或 easy.osz
imports/<song-id>/mug/normal.osu 或 normal.osz
imports/<song-id>/mug/hard.osu 或 hard.osz
imports/<song-id>/mug/expert.osu 或 expert.osz
imports/<service-id>/mug/service.osu 或 service.osz
```

也可以双击 `02_import_all_osu_mania.bat`。

5. 双击 `03_open_chart_editor.bat`，导入音频和 `charts/service/<id>.json` 或 `charts/tracks/<id>.json` 做最终人工检查与润色。
6. 润色后保存 JSON，再双击 `04_sync_charts_to_game.bat` 同步试玩版。此步只刷新游戏构建产物，不再改写 note 数据。

## 常用 bat 顺序

```text
00_convert_audio_to_m4a.bat    统一运行时音频为 m4a
01_prepare_mug_inputs.bat      准备 MuG 用的 source.wav
02_import_all_osu_mania.bat    批量导入 MuG 输出并自动筛查
03_open_chart_editor.bat       打开本地谱面编辑器做最终人工检查
04_sync_charts_to_game.bat     把 charts/ 同步到试玩版，不清洗谱面
05_start_local_server.bat      启动本地测试服务器
06_package_github_share.bat    生成可分享版本
```

## 谱面格式

项目内部只认 `charts/service/*.json` 与 `charts/tracks/*.json`：

```json
{
  "id": "drama",
  "type": "track",
  "title": "Drama",
  "song": "audio/tracks/drama.m4a",
  "beats": [0.5, 1.0],
  "downbeats": [0.5],
  "charts": {
    "easy": [],
    "normal": [],
    "hard": [],
    "expert": [
      {"id": 0, "kind": "tap", "time": 1.234, "end": 1.234, "lane": 0, "fruit": 0, "accent": "manual", "role": "verse", "intensity": 1}
    ]
  }
}
```

外部 `.osu` 只是草稿输入格式，不作为正式运行时资源提交给游戏读取。

## 操作

- 手机：单指点按或长按屏幕底部操作区。
- 电脑：鼠标左键、`Z`、`X` 或 `Space`。
- `R`：重试当前班次。
- `Esc`：暂停或返回上一层。
- `F1`：显示调试信息。

## 当前定位

这不是最终商业版本，而是用于快速分享、收集反馈的 playable prototype。当前战略是先用 HTML 验证核心循环、数据结构和玩家反馈；当“顾客故事 + service segment + 音游服务 + 店铺成长”闭环成立后，再考虑 Unreal Engine 5 正式实现。

最新设计共识：

- 玩家不是自顾自演奏的艺人，而是从暑期实习生逐步成长为店长。
- 音乐是制作饮品时的节奏感，不是顾客点播的演出。
- 日常营业未来使用 30-45 秒 `service segment` 服务具体顾客。
- 完整曲保留给练习、挑战、关键剧情、自愿加班和 ZONE 高表现奖励。
- 常客负责故事，半固定客群负责日常变化，路人订单负责经营压力。
- 练习模式不写经营进度；营业模式才影响金币、口碑、订单和关系。

详细设计见：

- `docs/shop_management_design.md`
- `rhythm_fruit_shop_game_design_doc_zh-CN.md`
- `docs/music_sourcing_recommendations.md`
- `docs/chart_generation_rules.md`
