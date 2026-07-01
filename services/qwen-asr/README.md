# Qwen ASR Service

Local speech-to-text runtime for `Qwen/Qwen3-ASR-1.7B`.

## Files

- `scripts/transcribe.py`: ASR CLI used by the app gateway.
- `service/requirements.txt`: Python dependencies.
- `venv/`: local Python environment, ignored by git.

## Install

```bash
python3 -m venv venv
venv/bin/pip install -r service/requirements.txt
```

## CLI

Run from the project root:

```bash
services/qwen-asr/venv/bin/python services/qwen-asr/scripts/transcribe.py output/audio.wav --language Auto
```

## App Gateway

The web app calls the root service gateway:

```bash
npm run python:service
```

The gateway exposes `POST http://127.0.0.1:8001/asr`.

## Notes

- `transcribe.py` includes an Apple MPS compatibility patch for Qwen3-ASR grouped-query attention.
- Set `QWEN_ASR_DEVICE=cpu` to force CPU fallback.
- Set `QWEN_ASR_MODEL` to override the model id.
