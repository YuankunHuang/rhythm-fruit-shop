# Audio Folder

这里存放 HTML demo 实际播放的音乐文件。

添加或替换歌曲时：

1. 把音频放入本目录，例如 `audio/tracks/drama.m4a`。
2. 双击 `00_convert_audio_to_m4a.bat` 统一格式与响度。已在 `audio/loudness-manifest.json` 登记且 hash 一致的 m4a 会自动跳过，所以反复跑不会损伤音质；只有新放进来或被覆盖过的文件会被处理。
3. 双击 `01_prepare_mug_inputs.bat` 生成 MuG 使用的 `imports/<song-id>/mug/source.wav`。
4. 在 MuG Diffusion 中使用对应 `source.wav` 生成 osu!mania `.osu` 或 `.osz` 草稿。
5. 双击 `02_import_all_osu_mania.bat` 导入草稿并自动筛查单指冲突。
6. 双击 `03_open_chart_editor.bat` 做最终人工检查与润色。
7. 保存后双击 `04_sync_charts_to_game.bat` 同步试玩版；此步不再清洗或回写 note 数据。

`stems/` 中的 Demucs 分轨不放在这里。它们是制谱参考，不是运行时资源。
