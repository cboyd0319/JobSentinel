"""Utility functions for GCP provisioning."""

import hashlib
import json
import os
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from cloud.utils import current_os


def sanitize_api_url(raw_url: str) -> str:
    candidate = raw_url.strip()
    if not candidate:
        raise ValueError("empty URL provided")

    if "://" not in candidate:
        candidate = f"https://{candidate}"

    parsed = urllib.parse.urlparse(candidate)

    if parsed.scheme not in {"http", "https"}:
        raise ValueError(f"Unsupported URL scheme: {parsed.scheme}")

    if not parsed.hostname:
        raise ValueError("URL is missing hostname")

    normalized = parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=(parsed.hostname or "").lower(),
        fragment="",
        params="",
    )

    return urllib.parse.urlunparse(normalized)


def build_google_api_url(host: str, segments: list[str], *, allow_colon_last: bool = False) -> str:
    if not host:
        raise ValueError("API host is required")

    quoted_segments: list[str] = []
    for index, segment in enumerate(segments):
        if not segment:
            raise ValueError("Empty path segment in API URL")
        safe = "-._~"
        if allow_colon_last and index == len(segments) - 1:
            safe += ":"
        quoted_segments.append(urllib.parse.quote(segment, safe=safe))

    path = "/" + "/".join(quoted_segments)
    return urllib.parse.urlunparse(("https", host, path, "", "", ""))


def safe_extract_zip(archive: zipfile.ZipFile, destination: Path) -> None:
    destination_path = destination.resolve()
    members = archive.namelist()
    for member in members:
        member_path = (destination_path / member).resolve()
        try:
            member_path.relative_to(destination_path)
        except ValueError as exc:
            raise RuntimeError("Zip archive contains unsafe path") from exc
        archive.extract(member, destination_path)


def safe_extract_tar(archive: tarfile.TarFile, destination: Path) -> None:
    destination_path = destination.resolve()
    for member in archive.getmembers():
        member_path = (destination_path / member.name).resolve()
        try:
            member_path.relative_to(destination_path)
        except ValueError as exc:
            raise RuntimeError("Tar archive contains unsafe path") from exc
        archive.extract(member, destination_path)


def download_https_file(
    url: str, destination: Path, *, allowed_host: str, timeout: int = 60, show_progress: bool = False
) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != allowed_host:
        raise RuntimeError("Unexpected download host")
    # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
    with urllib.request.urlopen(url, timeout=timeout) as response:  # nosec B310
        total_size = int(response.headers.get("Content-Length", 0))

        with destination.open("wb") as fh:
            if show_progress and total_size > 0:
                # Download with progress bar
                downloaded = 0
                block_size = 8192
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    downloaded += len(buffer)
                    fh.write(buffer)

                    # Calculate progress
                    percent = int((downloaded / total_size) * 100)
                    bar_length = 40
                    filled = int((downloaded / total_size) * bar_length)
                    bar = "█" * filled + "░" * (bar_length - filled)
                    downloaded_mb = downloaded / (1024 * 1024)
                    total_mb = total_size / (1024 * 1024)

                    # Print progress bar (carriage return to overwrite)
                    print(f"\r   |{bar}| {percent:3d}% ({downloaded_mb:.1f}/{total_mb:.1f} MB)", end="", flush=True)
                print()  # New line after completion
            else:
                # Download without progress bar for small files
                shutil.copyfileobj(response, fh)


def download_https_text(url: str, *, allowed_host: str, timeout: int = 30) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != allowed_host:
        raise RuntimeError("Unexpected download host")
    # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
    with urllib.request.urlopen(url, timeout=timeout) as response:  # nosec B310
        return response.read().decode("utf-8").strip()


def looks_like_placeholder(candidate: str, default: str) -> bool:
    placeholder_tokens = [
        "your_",
        "example.com",
        "example_",
        "hooks.slack.com/services/xxx",
    ]
    value = candidate.lower()
    if not value:
        return False
    return any(token in value for token in placeholder_tokens)
