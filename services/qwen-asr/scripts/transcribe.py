#!/usr/bin/env python3
import argparse
import json
import os
import sys

if not os.environ.get("HF_ENDPOINT"):
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

import torch
import torch.nn.functional as F
from qwen_asr import Qwen3ASRModel


MODEL_ID = os.environ.get("QWEN_ASR_MODEL", "Qwen/Qwen3-ASR-1.7B")


def patch_mps_gqa_sdpa():
    old_sdpa = F.scaled_dot_product_attention

    def sdpa(query, key, value, *args, **kwargs):
        if query.dim() == 4 and key.dim() == 4 and query.shape[1] != key.shape[1]:
            repeat = query.shape[1] // key.shape[1]
            key = key.repeat_interleave(repeat, dim=1)
            value = value.repeat_interleave(repeat, dim=1)
        return old_sdpa(query, key, value, *args, **kwargs)

    F.scaled_dot_product_attention = sdpa


def main():
    parser = argparse.ArgumentParser(description="Qwen3 ASR transcription")
    parser.add_argument("audio", help="Audio file path")
    parser.add_argument("--language", default="Auto", help="Language name or Auto")
    args = parser.parse_args()

    language = None if args.language == "Auto" else args.language
    requested_device = os.environ.get("QWEN_ASR_DEVICE", "mps").strip().lower()
    device_map = "mps" if requested_device == "mps" and torch.backends.mps.is_available() else "cpu"
    dtype = torch.float16 if device_map == "mps" else torch.float32

    if device_map == "mps":
        patch_mps_gqa_sdpa()

    model = Qwen3ASRModel.from_pretrained(
        MODEL_ID,
        dtype=dtype,
        device_map=device_map,
        max_inference_batch_size=1,
        max_new_tokens=512,
    )

    result = model.transcribe(audio=args.audio, language=language)[0]
    print(json.dumps({"language": result.language, "text": result.text}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
