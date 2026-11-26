"""Run after a Unix release build. Exercises cancellation and parent-process death."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time

RELEASE = Path(__file__).resolve().parents[1] / "src-tauri/target/release"


def wait_for(predicate):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    raise AssertionError("Transfer did not reach the expected state")


def check(interrupt_parent):
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        app = root / "orphetune"
        # current_exe resolves symlinks, so use a copy alongside the controlled provider.
        shutil.copyfile(RELEASE / "orphetune", app)
        app.chmod(0o755)
        provider = root / "yt-dlp"
        provider.write_text("""#!/usr/bin/env python3
import os, subprocess, sys
from pathlib import Path
stage = Path(sys.argv[2].removeprefix("temp:"))
child = subprocess.Popen([os.environ["TEST_FFMPEG"], "-nostdin", "-loglevel", "error", "-re", "-f", "lavfi", "-i", "sine=duration=120", str(stage / "partial.wav")])
Path("encoder.pid").write_text(str(child.pid))
sys.exit(child.wait())
""")
        provider.chmod(0o755)
        script = """import pathlib, subprocess, sys
worker = subprocess.Popen(["./orphetune", "--download-worker"], stdin=subprocess.PIPE)
pathlib.Path("worker.pid").write_text(str(worker.pid))
sys.stdin.buffer.read()
worker.stdin.close()
sys.exit(0 if worker.wait() == 1 else 1)
"""
        env = dict(os.environ, TEST_FFMPEG=str(RELEASE / "ffmpeg"))
        parent = subprocess.Popen(["python3", "-c", script], cwd=root, env=env, stdin=subprocess.PIPE)
        try:
            wait_for(lambda: any(root.glob(".orphetune-transfer-*/partial.wav")))
            encoder = int((root / "encoder.pid").read_text())
            if interrupt_parent:
                parent.kill()
            else:
                parent.stdin.close()
            assert parent.wait(timeout=5) == (-signal.SIGKILL if interrupt_parent else 0)
            wait_for(lambda: not list(root.glob(".orphetune-transfer-*")))
            stat = Path(f"/proc/{encoder}/stat")
            if stat.exists():
                assert stat.read_text().split()[2] == "Z", "FFmpeg is still running"
        finally:
            if parent.poll() is None:
                parent.kill()
                parent.wait()


if __name__ == "__main__":
    for crash in (False, True):
        check(crash)
    print("Transfer cancellation and parent death cleaned up the encoder and staging directory.")
