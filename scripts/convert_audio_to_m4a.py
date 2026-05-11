#!/usr/bin/env python3
"""Convert runtime audio under audio/ to AAC/M4A and rewrite project references."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from sync_charts_to_game import ROOT, sync_to_game as _sync_charts_to_game

SOURCE_AUDIO_SUFFIXES = {".opus", ".mp3", ".ogg", ".wav", ".flac"}
RUNTIME_AUDIO_SUFFIXES = SOURCE_AUDIO_SUFFIXES | {".m4a"}
LOUDNESS_MANIFEST = "loudness-manifest.json"
LOUDNORM_TARGET = {"i": -16.0, "tp": -1.5, "lra": 11.0}

try:
    sys.stdout.reconfigure(encoding="utf-8")
except AttributeError:
    pass


def rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def audio_files(audio_dir: Path, include_m4a: bool = True) -> list[Path]:
    if not audio_dir.exists():
        return []
    suffixes = RUNTIME_AUDIO_SUFFIXES if include_m4a else SOURCE_AUDIO_SUFFIXES
    return sorted(path for path in audio_dir.rglob("*") if path.is_file() and path.suffix.lower() in suffixes)


def record_matches(record: dict | None, src: Path, dst: Path, kbps: int, target: dict) -> bool:
    """Return True when the manifest record proves dst is already normalized for this src+settings."""
    if not record or not record.get("normalized"):
        return False
    if record.get("target") != target or record.get("kbps") != kbps:
        return False
    if src.suffix.lower() == ".m4a" and src == dst:
        return record.get("output_sha256") == sha256_file(dst)
    return record.get("source_sha256") == sha256_file(src)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ffmpeg_loudnorm_filter(measured: dict[str, str] | None = None) -> str:
    parts = [
        f"I={LOUDNORM_TARGET['i']}",
        f"TP={LOUDNORM_TARGET['tp']}",
        f"LRA={LOUDNORM_TARGET['lra']}",
    ]
    if measured:
        parts.extend(
            [
                f"measured_I={measured['input_i']}",
                f"measured_TP={measured['input_tp']}",
                f"measured_LRA={measured['input_lra']}",
                f"measured_thresh={measured['input_thresh']}",
                f"offset={measured['target_offset']}",
                "linear=true",
            ]
        )
    parts.append("print_format=json")
    return "loudnorm=" + ":".join(parts)


def parse_loudnorm_json(stderr: str) -> dict[str, str]:
    matches = list(re.finditer(r"\{[\s\S]*?\}", stderr))
    for match in reversed(matches):
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            continue
        if "input_i" in data or "output_i" in data:
            return data
    raise RuntimeError("ffmpeg loudnorm did not produce JSON stats")


def analyze_loudness(src: Path, ffmpeg: str) -> dict[str, str]:
    result = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-nostats",
            "-i",
            str(src),
            "-map",
            "0:a:0",
            "-af",
            ffmpeg_loudnorm_filter(),
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    )
    return parse_loudnorm_json(result.stderr)


def convert_one(src: Path, dst: Path, ffmpeg: str, kbps: int, force: bool, normalize_audio: bool) -> dict[str, object] | None:
    if dst.exists() and not force:
        print(f"  exists {rel(dst)}")
        return None
    dst.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".m4a", dir=dst.parent, delete=False) as tmp:
        tmp_path = Path(tmp.name)
    analysis: dict[str, str] | None = None
    output_stats: dict[str, str] | None = None
    source_hash = sha256_file(src)
    try:
        cmd = [ffmpeg, "-y"]
        if normalize_audio:
            cmd.extend(["-hide_banner", "-nostats"])
        else:
            cmd.extend(["-v", "error"])
        cmd.extend(["-i", str(src), "-vn", "-map", "0:a:0"])
        if normalize_audio:
            analysis = analyze_loudness(src, ffmpeg)
            cmd.extend(["-af", ffmpeg_loudnorm_filter(analysis)])
        cmd.extend(
            [
                "-c:a",
                "aac",
                "-b:a",
                f"{kbps}k",
                "-movflags",
                "+faststart",
                str(tmp_path),
            ]
        )
        result = subprocess.run(
            cmd,
            capture_output=normalize_audio,
            text=normalize_audio,
            encoding="utf-8" if normalize_audio else None,
            errors="replace" if normalize_audio else None,
            check=True,
        )
        if normalize_audio and result.stderr:
            output_stats = parse_loudnorm_json(result.stderr)
        tmp_path.replace(dst)
        print(f"  m4a {rel(src)} -> {rel(dst)}" + (" (loudnorm)" if normalize_audio else ""))
        return {
            "source": rel(src),
            "output": rel(dst),
            "source_sha256": source_hash,
            "output_sha256": sha256_file(dst),
            "target": LOUDNORM_TARGET,
            "analysis": analysis,
            "result": output_stats,
            "normalized": normalize_audio,
            "kbps": kbps,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise


def load_loudness_manifest(path: Path) -> dict[str, object]:
    if not path.exists():
        return {"version": 1, "target": LOUDNORM_TARGET, "files": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data.get("files"), dict):
            data["files"] = {}
        data["version"] = data.get("version", 1)
        data["target"] = LOUDNORM_TARGET
        return data
    except Exception:
        return {"version": 1, "target": LOUDNORM_TARGET, "files": {}}


def write_loudness_manifest(audio_dir: Path, records: list[dict[str, object]]) -> None:
    if not records:
        return
    manifest_path = audio_dir / LOUDNESS_MANIFEST
    data = load_loudness_manifest(manifest_path)
    files = data.setdefault("files", {})
    for record in records:
        files[str(record["output"])] = record
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  wrote {rel(manifest_path)}")


def rewrite_text_file(path: Path, replacements: dict[str, str]) -> None:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in sorted(replacements.items(), key=lambda item: len(item[0]), reverse=True):
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"  rewrote {rel(path)}")


def rewrite_chart_json(path: Path, replacements: dict[str, str]) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = False
    song = data.get("song")
    if song in replacements and replacements[song] != song:
        data["song"] = replacements[song]
        changed = True
    if changed:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  rewrote {rel(path)}")


def rewrite_references(replacements: dict[str, str]) -> None:
    if not replacements:
        return
    charts_dir = ROOT / "charts"
    for path in sorted(charts_dir.rglob("*.json")):
        if path.name == "manifest.json":
            continue
        rewrite_chart_json(path, replacements)
    rewrite_text_file(ROOT / "index.html", replacements)
    _sync_charts_to_game(charts_dir, ROOT / "data" / "songs.json")


def existing_m4a_replacements(audio_dir: Path) -> dict[str, str]:
    replacements: dict[str, str] = {}
    for path in sorted(audio_dir.rglob("*.m4a")):
        m4a_rel = rel(path)
        for suffix in [*sorted(SOURCE_AUDIO_SUFFIXES), ".m4a"]:
            replacements[rel(path.with_suffix(suffix))] = m4a_rel
            # Older chart files used flat audio/<file> paths before service/tracks subfolders existed.
            if path.parent != audio_dir:
                replacements[(Path("audio") / path.with_suffix(suffix).name).as_posix()] = m4a_rel
    return replacements


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert all runtime audio under audio/ to .m4a in place.")
    parser.add_argument("--audio-dir", type=Path, default=ROOT / "audio")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--kbps", type=int, default=128)
    parser.add_argument("--force", action="store_true", help="Re-encode + re-normalize every file regardless of manifest state")
    parser.add_argument("--keep-source", action="store_true", help="Keep original non-m4a files after successful conversion")
    parser.add_argument("--no-normalize-audio", action="store_true", help="Skip EBU R128 loudness normalization")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    audio_dir = args.audio_dir if args.audio_dir.is_absolute() else ROOT / args.audio_dir
    paths = audio_files(audio_dir, include_m4a=True)
    print(f"Audio files scanned: {len(paths)}")
    manifest_path = audio_dir / LOUDNESS_MANIFEST
    manifest = load_loudness_manifest(manifest_path)
    manifest_files = manifest.get("files", {}) if isinstance(manifest.get("files"), dict) else {}
    normalize = not args.no_normalize_audio
    replacements: dict[str, str] = existing_m4a_replacements(audio_dir)
    loudness_records: list[dict[str, object]] = []
    processed = skipped = 0
    for src in paths:
        dst = src.with_suffix(".m4a")
        old_rel = rel(src)
        new_rel = rel(dst)
        replacements[old_rel] = new_rel
        already_normalized = not args.force and dst.exists() and record_matches(manifest_files.get(new_rel), src, dst, args.kbps, LOUDNORM_TARGET)
        if args.dry_run:
            verb = "would skip" if already_normalized else "would convert"
            print(f"  {verb} {new_rel}")
            if already_normalized:
                skipped += 1
            else:
                processed += 1
            continue
        if already_normalized:
            print(f"  skip {new_rel} (manifest match)")
            skipped += 1
            if src != dst and not args.keep_source and src.exists():
                src.unlink()
                print(f"  removed {old_rel}")
            continue
        print(f"{old_rel} -> {new_rel}")
        record = convert_one(src, dst, args.ffmpeg, args.kbps, True, normalize)
        if record:
            loudness_records.append(record)
            processed += 1
        if not args.keep_source and src.exists() and src != dst:
            src.unlink()
            print(f"  removed {old_rel}")

    if not args.dry_run:
        write_loudness_manifest(audio_dir, loudness_records)
        rewrite_references(replacements)
    print(f"Done. processed={processed} skipped={skipped} total={len(paths)}")


if __name__ == "__main__":
    main()
