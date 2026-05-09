#!/usr/bin/env python3
"""Prepare WAV files and folders for MuG Diffusion batch charting."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from sync_charts_to_game import ROOT, chart_id, chart_type_from_song, chart_keys


AUDIO_SUFFIXES = {".opus", ".mp3", ".wav", ".ogg", ".flac", ".m4a"}

try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


def audio_files(audio_dir: Path) -> list[Path]:
    if not audio_dir.exists():
        return []
    paths = []
    for path in audio_dir.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in AUDIO_SUFFIXES:
            continue
        rel_parts = path.relative_to(audio_dir).parts
        if rel_parts and rel_parts[0] in {"ambient", "bgm", "sfx", "voice"}:
            continue
        paths.append(path)
    return sorted(paths)


def convert_to_wav(source: Path, target: Path, ffmpeg: str, force: bool) -> None:
    if target.exists() and not force:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg,
        "-y",
        "-v",
        "error",
        "-i",
        str(source),
        "-ac",
        "2",
        "-ar",
        "44100",
        str(target),
    ]
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert audio/service and audio/tracks files to imports/<song-id>/source.wav for MuG Diffusion.")
    parser.add_argument("--audio-dir", type=Path, default=ROOT / "audio")
    parser.add_argument("--imports-dir", type=Path, default=ROOT / "imports")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--no-convert", action="store_true", help="Only create folders and placeholder paths")
    args = parser.parse_args()

    audio_dir = args.audio_dir if args.audio_dir.is_absolute() else ROOT / args.audio_dir
    imports_dir = args.imports_dir if args.imports_dir.is_absolute() else ROOT / args.imports_dir
    paths = audio_files(audio_dir)
    print(f"Audio files: {len(paths)}")
    if not paths:
        print("No audio files found under audio/.")
        return

    for audio_path in paths:
        song_key = audio_path.relative_to(ROOT).as_posix() if audio_path.is_relative_to(ROOT) else f"audio/{audio_path.name}"
        song_id = chart_id(song_key)
        mug_dir = imports_dir / song_id / "mug"
        mug_dir.mkdir(parents=True, exist_ok=True)
        wav_path = mug_dir / "source.wav"
        if not args.no_convert:
            convert_to_wav(audio_path, wav_path, args.ffmpeg, args.force)
        print(f"\n{song_key}")
        print(f"  MuG audio: {wav_path.relative_to(ROOT).as_posix()}")
        for diff in chart_keys(chart_type_from_song(song_key)):
            print(f"  output:    {(mug_dir / f'{diff}.osu').relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
