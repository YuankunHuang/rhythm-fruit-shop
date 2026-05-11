# Imports

这里存放外部工具生成的草稿谱面。

推荐结构：

```text
imports/
  lemon-water/
    mug/
      service.osu
  drama/
    mug/
      easy.osu
      normal.osu
      hard.osu
      expert.osu
```

当前正式支持的草稿格式是 osu!mania `.osu` 或 `.osz`。导入后会写入 `charts/service/<id>.json` 或 `charts/tracks/<id>.json`，游戏运行时不会读取 `imports/`。

批量导入器会按 `imports/<song-id>/mug/<difficulty>.osu` 或 `.osz` 查找草稿。`track` 查找四个难度，`service` 查找单一 `service` 难度，例如：

```text
audio/service/lemon_water.m4a -> imports/lemon-water/mug/service.osu
audio/tracks/lets_drive.m4a -> imports/lets-drive/mug/easy.osz（或与难度同级的 .osu）
audio/tracks/maidens-capriccio.m4a -> imports/maidens-capriccio/mug/expert.osu
```
