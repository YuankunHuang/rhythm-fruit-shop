# Audio Folder

这里存放 HTML demo 实际播放的运行时音频。

目录约定：

- `ambient/`：环境底噪，不参与制谱。
- `bgm/`：菜单、店铺、过场背景音乐，不参与制谱。
- `service/`：短服务片段，需要单一 `service` 谱面。
- `tracks/`：完整曲，需要 `easy / normal / hard / expert` 四个谱面。
- `sfx/`：音效，不参与制谱。
- `voice/`：语音，不参与制谱。

添加或替换音频时，先放入对应子目录；如果来源不是 `.m4a`，双击 `00_convert_audio_to_m4a.bat` 统一格式、按 EBU R128 归一到 `-16 LUFS / -1.5 dBTP`，并重写引用。脚本会更新 `audio/loudness-manifest.json` 记录每个输出文件的响度分析与文件 hash。

如果要重新处理已经存在的 `.m4a`，运行：

```powershell
python scripts\convert_audio_to_m4a.py --force
```

随后运行 `01_prepare_mug_inputs.bat` 生成 MuG 使用的 `imports/<song-id>/mug/source.wav`。

`stems/` 中的 Demucs 分轨不放在这里。它们是制谱参考，不是运行时资源。
