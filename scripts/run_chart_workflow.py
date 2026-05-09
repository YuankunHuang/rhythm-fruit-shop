#!/usr/bin/env python3
"""Run the current HTML-demo chart workflow around a 3K osu!mania draft."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from import_osu_mania import import_osu
from sync_charts_to_game import CHART_KEYS
from sync_charts_to_game import ROOT


def run_demucs(audio_path: Path, stems_dir: Path, model: str) -> None:
    stems_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        "-m",
        "demucs",
        "-n",
        model,
        "--out",
        str(stems_dir),
        str(audio_path),
    ]
    print("Running Demucs:")
    print("  " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare stems and import a 3K osu!mania draft into the playable demo.")
    parser.add_argument("--audio", type=Path, help="Source audio under audio/, used when running Demucs")
    parser.add_argument("--osu", type=Path, help="3K osu!mania draft exported by MuG Diffusion")
    parser.add_argument("--difficulty", choices=CHART_KEYS, default="expert")
    parser.add_argument("--audio-key", help="Project audio key, for example audio/tracks/drama.m4a")
    parser.add_argument("--demucs", action="store_true", help="Run local Demucs before importing the .osu draft")
    parser.add_argument("--demucs-model", default="htdemucs", help="Demucs model name, defaults to htdemucs")
    parser.add_argument("--stems-dir", type=Path, default=ROOT / "stems")
    parser.add_argument("--charts-dir", type=Path, default=ROOT / "charts")
    parser.add_argument("--index", type=Path, default=ROOT / "index.html")
    parser.add_argument("--no-sync", action="store_true")
    args = parser.parse_args()

    audio_path = None
    if args.audio:
        audio_path = args.audio if args.audio.is_absolute() else ROOT / args.audio
    if args.demucs:
        if not audio_path:
            raise SystemExit("--demucs requires --audio")
        run_demucs(audio_path, args.stems_dir, args.demucs_model)

    if args.osu:
        osu_path = args.osu if args.osu.is_absolute() else ROOT / args.osu
        audio_key = args.audio_key
        if not audio_key and audio_path:
            audio_key = audio_path.relative_to(ROOT).as_posix() if audio_path.is_relative_to(ROOT) else f"audio/{audio_path.name}"
        import_osu(osu_path, args.difficulty, audio_key, args.charts_dir, args.index, not args.no_sync)
    else:
        print("No .osu file was provided. Demucs output is ready for MuG/manual review.")


if __name__ == "__main__":
    main()
