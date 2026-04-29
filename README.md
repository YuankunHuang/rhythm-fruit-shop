# 节奏鲜果铺 Demo

这是一个可直接分享体验的 HTML 音游 demo。当前版本聚焦完整日内循环：上班、选歌、打歌、班次结算、继续营业、下班查看当日经营日报。

## 如何体验

1. 保持本目录内文件结构不变。
2. 双击打开 `index.html`，或用任意静态服务器打开本目录。
3. 点击“开门营业”，选择歌曲和难度后开始打歌。

如果浏览器限制本地音频播放，建议在本目录启动一个静态服务器，例如：

```bash
python -m http.server 8080
```

然后访问 `http://localhost:8080/`。

## 操作

- 手机：单指点按或长按屏幕底部操作区。
- 电脑：鼠标左键、`Z`、`X` 或 `Space`。
- `R`：重试当前班次。
- `Esc`：暂停或返回上一层。
- `F1`：显示调试信息。

## 分享包需要包含

- `index.html`：可玩 demo 入口，已内嵌谱面和主要逻辑。
- `hybrid_charts.json`：当前生成版谱面数据，便于检查和后续迭代。
- `M2U - Quo Vadis.mp3`
- `Nightmare by M2U.mp3`
- `Renatus - Soleily.mp3`
- `README.md`

## 开发资料

- `rhythm_fruit_aim_game_design_doc_zh-CN.md`：当前中文设计文档。
- `docs/chart_post_processor_rules.md`：谱面后处理规则。
- `scripts/chart_post_processor.py`：谱面后处理脚本。
- `chart_sources/hybrid_charts_raw.json`：后处理输入源。
- `assets/fruit_asset_source.txt`：水果素材来源记录。

## 当前定位

这不是最终商业版本，而是用于快速分享、收集反馈的 playable demo。优先保证音频同步、单指可玩、谱面可读、打击反馈和日内经营闭环。
