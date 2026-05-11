# Audio Folder

这里存放 HTML demo 实际播放的运行时音频。

目录约定：

- `ambient/`：环境底噪，不参与制谱。
- `bgm/`：菜单、店铺、过场背景音乐，不参与制谱。
- `service/`：短服务片段，需要单一 `service` 谱面。
- `tracks/`：完整曲，需要 `easy / normal / hard / expert` 四个谱面。
- `sfx/`：音效，不参与制谱。
- `voice/`：语音，不参与制谱。

添加或替换音频时，先放入对应子目录，然后双击 `00_convert_audio_to_m4a.bat`：脚本会扫所有运行时音频（含 `.m4a`），按 EBU R128 归一到 `-16 LUFS / -1.5 dBTP / LRA 11`，并重写谱面与 `index.html` 的引用。

是否处理由 `audio/loudness-manifest.json` 决定——它记录了每个已归一化文件的 source/output `sha256`、归一化目标和码率。已在 manifest 里登记且 hash 一致的 `.m4a` 会直接跳过，避免每次 AAC→AAC 代际损失；只有新文件（manifest 没记录）或外部更新过的文件（hash 对不上）才会重转。

预演（不写任何文件）：

```powershell
python scripts\convert_audio_to_m4a.py --dry-run
```

如果确实需要重新处理所有 `.m4a`（例如归一化目标改了），加 `--force`：

```powershell
python scripts\convert_audio_to_m4a.py --force
```

随后运行 `01_prepare_mug_inputs.bat` 生成 MuG 使用的 `imports/<song-id>/mug/source.wav`。

`stems/` 中的 Demucs 分轨不放在这里。它们是制谱参考，不是运行时资源。
