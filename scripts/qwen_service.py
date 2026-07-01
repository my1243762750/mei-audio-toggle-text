#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
QWEN_TTS_DIR = ROOT / "services" / "qwen-tts"
QWEN_ASR_DIR = ROOT / "services" / "qwen-asr"
QWEN_TTS_PYTHON = QWEN_TTS_DIR / "venv" / "bin" / "python"
QWEN_ASR_PYTHON = QWEN_ASR_DIR / "venv" / "bin" / "python"
QWEN_TTS_SCRIPT = QWEN_TTS_DIR / "scripts" / "tts.py"
QWEN_ASR_SCRIPT = QWEN_ASR_DIR / "scripts" / "transcribe.py"
DEFAULT_HOST = os.environ.get("QWEN_SERVICE_HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("QWEN_SERVICE_PORT", "8001"))


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def load_json(handler: BaseHTTPRequestHandler) -> dict:
    content_length = int(handler.headers.get("Content-Length", "0"))
    if content_length <= 0:
        raise ValueError("请求体为空")

    body = handler.rfile.read(content_length)
    return json.loads(body.decode("utf-8"))


def run_tts(payload: dict) -> dict:
    text = str(payload.get("text", "")).strip()
    mode = str(payload.get("mode", "custom_voice"))
    speaker = str(payload.get("speaker", "Serena"))
    language = str(payload.get("language", "Chinese"))
    instruct = str(payload.get("instruct", "")).strip()
    ref_text = str(payload.get("refText", "")).strip()
    output_dir = str(payload.get("outputDir", "")).strip()
    ref_audio = str(payload.get("refAudio", "")).strip()

    if not text:
        raise ValueError("请输入文字")

    args = [
        str(QWEN_TTS_PYTHON),
        str(QWEN_TTS_SCRIPT),
        text,
        "--mode",
        mode,
        "--language",
        language,
        "--output",
        output_dir or str(ROOT / "output"),
    ]

    if mode == "custom_voice":
        args.extend(["--speaker", speaker])

    if instruct:
        args.extend(["--instruct", instruct])

    if mode == "base_clone":
        if not ref_audio or not ref_text:
            raise ValueError("Base 声音克隆需要参考音频和对应文本")
        args.extend(["--ref-audio", ref_audio, "--ref-text", ref_text])

    completed = subprocess.run(
        args,
        cwd=QWEN_TTS_DIR,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
        timeout=180,
        check=False,
    )

    if completed.returncode != 0:
        message = (completed.stderr or completed.stdout).strip() or "生成失败"
        raise RuntimeError(message)

    match = re.search(r"File:\s*(.+\.wav)", completed.stdout)
    if not match:
        raise RuntimeError("生成失败：没有找到音频文件")

    return {"filePath": match.group(1).strip()}


def run_asr(payload: dict) -> dict:
    audio_path = str(payload.get("audioPath", "")).strip()
    language = str(payload.get("language", "Auto")).strip() or "Auto"

    if not audio_path:
        raise ValueError("请先选择音频文件")

    completed = subprocess.run(
        [
            str(QWEN_ASR_PYTHON),
            str(QWEN_ASR_SCRIPT),
            audio_path,
            "--language",
            language,
        ],
        cwd=QWEN_ASR_DIR,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
        timeout=300,
        check=False,
    )

    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "识别失败"
        raise RuntimeError(message)

    lines = [line for line in completed.stdout.strip().splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("识别失败")

    return json.loads(lines[-1])


class QwenServiceHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/health":
            json_response(self, HTTPStatus.OK, {"status": "ok"})
            return

        json_response(self, HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_POST(self) -> None:
        try:
            payload = load_json(self)

            if self.path == "/tts":
                json_response(self, HTTPStatus.OK, run_tts(payload))
                return

            if self.path == "/asr":
                json_response(self, HTTPStatus.OK, run_asr(payload))
                return

            json_response(self, HTTPStatus.NOT_FOUND, {"error": "Not found"})
        except ValueError as error:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except Exception as error:
            json_response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def log_message(self, format: str, *args) -> None:
        return


def main() -> int:
    server = ThreadingHTTPServer((DEFAULT_HOST, DEFAULT_PORT), QwenServiceHandler)
    print(f"Qwen service listening on http://{DEFAULT_HOST}:{DEFAULT_PORT}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
