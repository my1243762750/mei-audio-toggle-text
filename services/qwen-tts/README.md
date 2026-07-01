# Qwen TTS Service

Local text-to-speech runtime for `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`.

## Files

- `scripts/tts.py`: TTS CLI used by the app gateway.
- `scripts/requirements.txt`: Python dependencies.
- `venv/`: local Python environment, ignored by git.

## Install

```bash
python3 -m venv venv
venv/bin/pip install -r scripts/requirements.txt
```

## CLI

Run from this directory:

```bash
venv/bin/python scripts/tts.py "你好，这是一段测试语音。" --output ../../output
```

## App Gateway

The web app calls the root service gateway:

```bash
npm run python:service
```

The gateway exposes `POST http://127.0.0.1:8001/tts`.
