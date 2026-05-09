# Chart Workflow Rules

当前项目只保留一条正式制谱主线：3K osu!mania 草稿导入。

## Source Of Truth

`charts/` 是唯一正式谱面源。试玩版运行时通过 `charts/manifest.json` 加载每首歌的正式 JSON。

不要在 `index.html` 中手动添加谱面常量，也不要恢复旧的内嵌谱面构建产物。

当前运行时区分 `service` 和 `track`。`service` 使用单一 `service` 谱面，`track` 使用 `easy / normal / hard / expert` 四个难度。谱面元数据属于 `charts/` 或相邻数据文件的正式内容，不应重新写回 `index.html`。

## Current Pipeline

1. **Audio**
   - 正式播放文件放入 `audio/service/` 或 `audio/tracks/`。
   - 运行时音频统一为 `.m4a`。可运行 `00_convert_audio_to_m4a.bat` 递归转换 `audio/` 并重写引用。
   - 文件路径必须和 chart JSON 的 `song` 字段一致，例如 `audio/tracks/drama.m4a`。

2. **Stem Cache**
   - Demucs v4 输出放入 `stems/`。
   - `stems/` 只用于判断鼓点、旋律、密度和情绪变化，不参与运行时加载。

3. **AI Draft**
   - MuG Diffusion 输出 3K osu!mania `.osu`。
   - 草稿放入 `imports/<song>/mug/`。
   - `service` 需要 `service.osu`，`track` 需要 `easy / normal / hard / expert` 各自的 `.osu` 文件。

4. **Import**
   - 使用 `scripts/import_osu_mania.py` 转换为 `charts/service/<id>.json` 或 `charts/tracks/<id>.json`。
   - `.osu` 的 `CircleSize:3` 会映射为项目 lane `-1 / 0 / 1`。
   - osu!mania hold note 会映射为项目 `press`。

5. **Human Polish**
   - 使用 `tools/chart_editor.html` 进行最终微调。
   - 编辑器可以导入正式 JSON，也可以直接导入 `.osu` 草稿做快速检查。

6. **Sync**
   - 修改 `charts/` 后运行 `scripts/sync_charts_to_game.py`。

## Difficulty Policy

当前游戏是单指玩法，所以难度不由真实多键输入决定，而由以下因素决定：

- 音符密度。
- 长按数量。
- 连续输入间隔。
- 视觉 lane 编舞复杂度。
- 情绪段落的表现力度。

3K lane 是美术和节奏表现层，不是输入要求。导入器可以接受非 3K osu!mania 谱面，但只会折叠到三条视觉 lane；正式推荐仍是直接让 MuG 输出 3K。

## Single-Finger Hold Rule

`press` 是单指长按事件。任何 `press` 持续期间都不能出现其他 `tap` 或 `press`：

- 如果 MuG 草稿在长条内部生成了单点，导入时会自动删除这些单点。
- 如果两个长条重叠，只保留时间更早的长条；同一时间开始时优先保留更长的长条。
- 高难度不通过“必须多指”实现，而通过更密的可单指节奏、更复杂的视觉 lane 编舞和更强的段落设计实现。
- 长条强制判定起点和“太早松开”。尾端附近有容忍窗口，提前一点松开仍算完成；超过容忍窗口的过早松手是 `EarlyRelease`，计为 Miss 并断 combo。

## Service Segment Policy

`service segment` 是经营/剧情层的片段选择概念，不改变单指谱面规则。

推荐策略：

- 完整曲保留为 `track` 谱面，用于练习、挑战、关键剧情、自愿加班和 ZONE 高阶奖励。
- 日常服务优先使用 20-30 秒独立短 clip；后续也可以支持从完整曲切 segment。
- `service` 不提供玩家可选难度，难度来自订单、剧情上下文和数值压力。
- segment 的起止时间必须落在对应音频和谱面范围内。
- segment 不应切在长按中间；如果必须切入，应在人工润色时重新处理边界音符。
- segment 应携带顾客/时段/情绪/密度等元数据，但谱面 note 本身仍保持当前 `tap` / `press` 格式。

示例元数据方向：

```json
{
  "segments": [
    {
      "id": "student_rush",
      "start": 24.0,
      "end": 60.0,
      "mood": "sweet_fast_bright",
      "customerTags": ["student", "rush"],
      "density": "medium"
    }
  ]
}
```

## Commands

准备 MuG 输入 WAV 和输出目录：

```powershell
python scripts\prepare_mug_inputs.py
```

导入单个 `.osu` 草稿：

```powershell
python scripts\import_osu_mania.py imports\drama\mug\expert.osz --difficulty expert --audio-key audio/tracks/drama.m4a
```

批量导入 `audio/service` 与 `audio/tracks` 中所有需要谱面的音频：

```powershell
python scripts\import_all_osu_mania.py
```

默认批量导入会跳过已经存在的正式 chart JSON，保护人工润色结果。只有明确要替换旧谱时才使用：

```powershell
python scripts\import_all_osu_mania.py --overwrite
```

批量导入器按 `audio` 文件 stem 进行匹配，例如 `audio/tracks/night of fire.m4a` 会寻找：

```text
imports/night-of-fire/mug/easy.osu 或 easy.osz
imports/night-of-fire/mug/normal.osu 或 normal.osz
imports/night-of-fire/mug/hard.osu 或 hard.osz
imports/night-of-fire/mug/expert.osu 或 expert.osz
```

`audio/service/lemon_water.m4a` 会寻找：

```text
imports/lemon-water/mug/service.osu 或 service.osz
```

只同步正式谱面：

```powershell
python scripts\sync_charts_to_game.py
```

同步脚本只刷新 `charts/manifest.json` 和 `index.html` 中的歌曲元数据，不负责最终筛查，也不应回写人工编辑后的 `charts/*.json`。

## File Ownership

- `audio/service`、`audio/tracks`：需要谱面的运行时音频。
- `audio/ambient`、`audio/bgm`、`audio/sfx`、`audio/voice`：不参与制谱的运行时音频。
- `stems/`：外部分析缓存。
- `imports/`：外部草稿。
- `charts/service`、`charts/tracks`：正式谱面。
- `index.html`：试玩入口和构建产物承载文件。

## Legacy Policy

旧的 librosa 自动打谱管线已经移除。现在不再从裸音频直接生成正式谱面；裸音频必须先经过外部 AI/编辑器生成 `.osu` 草稿，再导入项目格式。
