"""
Shared camera configuration for all face-recognition-poc scripts.
Saves/loads camera source and stream port so every script uses the same camera.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

POC_DIR = Path(__file__).resolve().parent
CONFIG_PATH = POC_DIR / "camera_config.json"
DEFAULT_CAM_IP = "192.168.29.224"
DEFAULT_CAM_PORT = "4747"
DEFAULT_STREAM_PORT = 5000


def load_camera_config() -> tuple[str | int | None, int | None]:
    """
    Load saved camera config. Returns (video_source, stream_port).
    video_source is int 0 for webcam or str URL. stream_port is int or None.
    Returns (None, None) if no config or env VIDEO_SOURCE is set (env takes precedence).
    """
    if os.environ.get("VIDEO_SOURCE") is not None:
        raw = os.environ.get("VIDEO_SOURCE", "")
        vs = int(raw) if raw.strip().isdigit() else raw.strip()
        sp = int(os.environ.get("STREAM_PORT", str(DEFAULT_STREAM_PORT)))
        return vs, sp
    if not CONFIG_PATH.exists():
        return None, None
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        vs = data.get("video_source")
        if vs is None:
            return None, None
        if isinstance(vs, int):
            return vs, data.get("stream_port", DEFAULT_STREAM_PORT)
        return str(vs), data.get("stream_port", DEFAULT_STREAM_PORT)
    except Exception:
        return None, None


def save_camera_config(video_source: int | str, stream_port: int = DEFAULT_STREAM_PORT) -> None:
    """Save camera source and stream port so all scripts use the same camera."""
    data = {
        "video_source": video_source,
        "stream_port": stream_port,
    }
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"  (Saved to {CONFIG_PATH} — all scripts will use this camera)")


def prompt_camera_config(ask_stream_port: bool = True) -> tuple[int | str, int]:
    """
    Use saved config if available (and user confirms), else prompt and save.
    Returns (VIDEO_SOURCE, STREAM_PORT). VIDEO_SOURCE is int 0 or str URL.
    """
    video_source, stream_port = load_camera_config()
    if video_source is not None and stream_port is not None:
        use_saved = input(f"  Use saved camera? (Y/n) [Y]: ").strip().lower()
        if use_saved != "n" and use_saved != "no":
            print(f"  VIDEO_SOURCE: {video_source}  STREAM_PORT: {stream_port}")
            return video_source, stream_port
    # Prompt
    print("Camera source (DroidCam / IP webcam, or webcam)")
    ip = input(f"  IP address (or 0 for webcam) [{DEFAULT_CAM_IP}]: ").strip() or DEFAULT_CAM_IP
    if ip == "0" or ip.lower() == "webcam":
        video_source = 0
    else:
        port = input(f"  Port [{DEFAULT_CAM_PORT}]: ").strip() or DEFAULT_CAM_PORT
        video_source = f"http://{ip}:{port}/video"
    stream_port = DEFAULT_STREAM_PORT
    if ask_stream_port:
        sp = input(f"  Stream port for dashboard [{DEFAULT_STREAM_PORT}]: ").strip() or str(DEFAULT_STREAM_PORT)
        stream_port = int(sp)
    save_camera_config(video_source, stream_port)
    return video_source, stream_port
