#!/usr/bin/env python3
"""Браузерные проверки сайта в фоновом Edge/Chrome (без установки пакетов).

Запуск:  python scripts/browser_check.py

Поднимает локальный сервер из корня репозитория, открывает
tests/browser.html?case=… для каждой проверки и читает результат
из <title> («PASS …» / «FAIL …»). Код возврата 0 — всё прошло.
"""
from __future__ import annotations

import functools
import http.server
import re
import subprocess
import sys
import threading
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent

BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]

CASES = [
    "case=viewer-click-image",
    "case=old-series-slug",
    "case=menu-fit&w=1440&h=900",
    "case=menu-fit&w=1366&h=650",
    "case=menu-fit&w=1280&h=600",
    "case=menu-fit&w=1366&h=620",
    "case=menu-fit&w=915&h=412",
    "case=menu-fit&w=844&h=390",
    "case=menu-fit&w=390&h=844",
    "case=menu-fit&w=360&h=640",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:
        pass


def find_browser() -> str | None:
    return next((b for b in BROWSERS if Path(b).exists()), None)


def main() -> int:
    browser = find_browser()
    if not browser:
        print("Не найден Edge или Chrome — браузерные проверки пропущены.")
        return 2

    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]

    failed = 0
    try:
        for case in CASES:
            url = f"http://127.0.0.1:{port}/tests/browser.html?{case}"
            out = subprocess.run(
                [browser, "--headless=new", "--disable-gpu", "--window-size=1600,1000",
                 "--virtual-time-budget=15000", "--dump-dom", url],
                capture_output=True, text=True, encoding="utf-8", timeout=120,
            ).stdout
            m = re.search(r"<title>(.*?)</title>", out, re.S)
            title = m.group(1).strip() if m else "FAIL нет результата"
            print(("  ✓ " if title.startswith("PASS") else "  ✗ ") + title)
            failed += not title.startswith("PASS")
    finally:
        server.shutdown()

    print(f"\n{'OK' if not failed else f'ПРОВАЛЕНО: {failed}'} — проверок: {len(CASES)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
