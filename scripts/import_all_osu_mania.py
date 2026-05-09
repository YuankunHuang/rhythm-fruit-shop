#!/usr/bin/env python3
"""Batch import 3K osu!mania drafts for every service/track audio file."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from import_osu_mania import import_osu
from sync_charts_to_game import ROOT, chart_id, chart_type_from_song, chart_keys, existing_chart_file_path, sync_to_game


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


def draft_candidates(imports_dir: Path, song_id: str, diff: str) -> list[Path]:
    names = [
        imports_dir / song_id / "mug" / f"{diff}.osu",
        imports_dir / song_id / "mug" / f"{diff}.osz",
        imports_dir / song_id / f"{diff}.osu",
        imports_dir / song_id / f"{diff}.osz",
        imports_dir / f"{song_id}-{diff}.osu",
        imports_dir / f"{song_id}-{diff}.osz",
        imports_dir / f"{song_id}_{diff}.osu",
        imports_dir / f"{song_id}_{diff}.osz",
    ]
    return names


def find_draft(imports_dir: Path, song_id: str, diff: str) -> Path | None:
    for path in draft_candidates(imports_dir, song_id, diff):
        if path.exists():
            return path
    return None


def print_plan(
    audio_paths: list[Path],
    imports_dir: Path,
    charts_dir: Path,
    overwrite: bool,
) -> tuple[list[tuple[Path, str, Path]], list[tuple[str, str]], list[tuple[str, Path]]]:
    imports: list[tuple[Path, str, Path]] = []
    missing: list[tuple[str, str]] = []
    skipped: list[tuple[str, Path]] = []
    for audio_path in audio_paths:
        song_key = audio_path.relative_to(ROOT).as_posix() if audio_path.is_relative_to(ROOT) else f"audio/{audio_path.name}"
        song_id = chart_id(song_key)
        print(f"\n{song_key}")
        chart_path = existing_chart_file_path(charts_dir, song_key)
        if chart_path.exists() and not overwrite:
            print(f"  skip   existing chart {chart_path.relative_to(ROOT).as_posix()}")
            skipped.append((song_key, chart_path))
            continue
        for diff in chart_keys(chart_type_from_song(song_key)):
            draft = find_draft(imports_dir, song_id, diff)
            if draft:
                print(f"  {diff:6s} <- {draft.relative_to(ROOT).as_posix()}")
                imports.append((audio_path, diff, draft))
            else:
                expected = imports_dir / song_id / "mug" / f"{diff}.osu/.osz"
                print(f"  {diff:6s} missing {expected.relative_to(ROOT).as_posix()}")
                missing.append((song_key, diff))
    return imports, missing, skipped


def scaffold_import_dirs(audio_paths: list[Path], imports_dir: Path) -> None:
    for audio_path in audio_paths:
        song_key = audio_path.relative_to(ROOT).as_posix() if audio_path.is_relative_to(ROOT) else f"audio/{audio_path.name}"
        song_id = chart_id(song_key)
        (imports_dir / song_id / "mug").mkdir(parents=True, exist_ok=True)


def print_missing_details(missing: list[tuple[str, str]], imports_dir: Path) -> None:
    if not missing:
        return
    print("\nMissing draft details:")
    for song_key, diff in missing:
        song_id = chart_id(song_key)
        expected = imports_dir / song_id / "mug" / f"{diff}.osu"
        alt = expected.with_suffix(".osz")
        expected_text = expected.relative_to(ROOT).as_posix() if expected.is_relative_to(ROOT) else str(expected)
        alt_text = alt.relative_to(ROOT).as_posix() if alt.is_relative_to(ROOT) else str(alt)
        print(f"  {song_key} [{diff}]")
        print(f"    put MuG output at: {expected_text}")
        print(f"    or:                {alt_text}")


def print_skipped_details(skipped: list[tuple[str, Path]]) -> None:
    if not skipped:
        return
    print("\nSkipped existing charts:")
    for song_key, chart_path in skipped:
        chart_text = chart_path.relative_to(ROOT).as_posix() if chart_path.is_relative_to(ROOT) else str(chart_path)
        print(f"  {song_key} -> {chart_text}")
    print("Use --overwrite only when you intentionally want to replace existing chart JSON files.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch import osu!mania drafts for service and track audio.")
    parser.add_argument("--audio-dir", type=Path, default=ROOT / "audio")
    parser.add_argument("--imports-dir", type=Path, default=ROOT / "imports")
    parser.add_argument("--charts-dir", type=Path, default=ROOT / "charts")
    parser.add_argument("--index", type=Path, default=ROOT / "index.html")
    parser.add_argument("--scaffold", action="store_true", help="Create imports/<song-id>/mug/ folders for every audio file")
    parser.add_argument("--dry-run", action="store_true", help="Only show which .osu files would be imported")
    parser.add_argument("--overwrite", action="store_true", help="Import even when the target chart JSON already exists")
    args = parser.parse_args()

    audio_dir = args.audio_dir if args.audio_dir.is_absolute() else ROOT / args.audio_dir
    imports_dir = args.imports_dir if args.imports_dir.is_absolute() else ROOT / args.imports_dir
    audio_paths = audio_files(audio_dir)
    print(f"Audio files: {len(audio_paths)}")
    print(f"Imports dir: {imports_dir.relative_to(ROOT).as_posix() if imports_dir.is_relative_to(ROOT) else imports_dir}")
    if not audio_paths:
        print("No audio files found. Put playable music files under audio/ first.")
        return
    if args.scaffold:
        scaffold_import_dirs(audio_paths, imports_dir)
        print("Created imports/<song-id>/mug/ folders.")

    imports, missing, skipped = print_plan(audio_paths, imports_dir, args.charts_dir, args.overwrite)
    print(f"\nReady to import: {len(imports)}")
    print(f"Skipped existing charts: {len(skipped)}")
    print(f"Missing drafts: {len(missing)}")
    if args.dry_run:
        print_skipped_details(skipped)
        print_missing_details(missing, imports_dir)
        return

    for audio_path, diff, draft in imports:
        song_key = audio_path.relative_to(ROOT).as_posix() if audio_path.is_relative_to(ROOT) else f"audio/{audio_path.name}"
        import_osu(draft, diff, song_key, args.charts_dir, args.index, sync=False)
    if imports:
        sync_to_game(args.charts_dir, args.index)
        print("\nImported drafts were cleaned, then synced to the playable demo.")
    if skipped:
        print_skipped_details(skipped)
    if missing:
        print_missing_details(missing, imports_dir)
        print("\nGenerate the missing drafts in MuG Diffusion, then run this script again.")


if __name__ == "__main__":
    main()
