"""
Armenian Whisper STT: CTranslate2 conversion + sequential inference.

Why CTranslate2/faster-whisper instead of raw `transformers`: on CPU-only
hardware (this dev machine has no GPU), CTranslate2's int8 kernels run
meaningfully faster than the stock PyTorch/transformers pipeline. Converting
a HF Whisper checkpoint to CTranslate2 format is a standard, lossless
format/quantization conversion (the same one the faster-whisper project
itself documents) — it does not retrain or alter the model's behavior, only
how the existing weights are stored/executed.

Resource safety: never hold both Armenian models in memory at once. Callers
must run one model fully (load -> transcribe -> unload) before loading the
next. `run_single_model` enforces this locally; the two calls in
server/main.py are made sequentially, not in parallel.
"""
from __future__ import annotations

import gc
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

MODEL_CACHE_DIR = Path(os.environ.get("MODEL_CACHE_DIR", "./model_cache")).resolve()

# Exactly the two models requested — do not substitute.
ARMENIAN_MODELS: dict[str, str] = {
    "large_v3_turbo": "Chillarmo/whisper-large-v3-turbo-armenian",
    "small_v2": "Chillarmo/whisper-small-armenian-v2",
}

ARMENIAN_LANGUAGE_CODE = "hy"  # Whisper's built-in code for Armenian


def _ct2_path_for(hf_id: str) -> Path:
    safe_name = hf_id.replace("/", "__")
    return MODEL_CACHE_DIR / "ct2" / safe_name


def _device_and_compute_type() -> tuple[str, str]:
    """Use GPU if present, else fall back to CPU. Never require a GPU."""
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def ensure_ct2_model(hf_id: str) -> Path:
    """Convert an HF Whisper checkpoint to CTranslate2 format, once, and cache it.

    Skips conversion (and thus re-download) if the cached model already
    exists on disk, per the "don't download every server start" requirement.
    """
    out_dir = _ct2_path_for(hf_id)
    if not (out_dir / "model.bin").exists():
        from ctranslate2.converters import TransformersConverter

        out_dir.parent.mkdir(parents=True, exist_ok=True)
        converter = TransformersConverter(hf_id)
        # int8: standard CPU-friendly post-training quantization, applied by
        # CTranslate2 itself during conversion — not a hand-rolled precision hack.
        converter.convert(str(out_dir), quantization="int8", force=False)

    _ensure_preprocessor_config(hf_id, out_dir)
    return out_dir


def _ensure_preprocessor_config(hf_id: str, out_dir: Path) -> None:
    """Copy preprocessor_config.json (mel-bin count etc.) alongside the weights.

    ctranslate2's TransformersConverter only exports the model weights/config,
    not the feature-extractor config. faster-whisper reads feature_size from
    preprocessor_config.json in the model dir; without it, it silently
    defaults to 80 mel bins. large-v3-based checkpoints (like large-v3-turbo)
    use 128 mel bins, so the missing file causes a shape-mismatch crash at
    inference time, not at load time. Idempotent/cheap: huggingface_hub
    resolves this from the already-downloaded local cache, no re-download.
    """
    dest = out_dir / "preprocessor_config.json"
    if dest.exists():
        return
    import shutil

    from huggingface_hub import hf_hub_download

    src = hf_hub_download(hf_id, "preprocessor_config.json")
    shutil.copy(src, dest)


@dataclass
class TranscriptionResult:
    model_key: str
    hf_id: str
    ok: bool = False
    transcript: str = ""
    language: str = ARMENIAN_LANGUAGE_CODE
    audio_duration_sec: float = 0.0
    processing_time_sec: float = 0.0
    real_time_factor: Optional[float] = None
    device: str = "cpu"
    compute_type: str = "int8"
    gpu_name: Optional[str] = None
    error: Optional[str] = None


def run_single_model(hf_id: str, model_key: str, audio_path: str) -> TranscriptionResult:
    result = TranscriptionResult(model_key=model_key, hf_id=hf_id)
    device, compute_type = _device_and_compute_type()
    result.device = device
    result.compute_type = compute_type

    model = None
    try:
        from faster_whisper import WhisperModel

        if device == "cuda":
            import torch

            result.gpu_name = torch.cuda.get_device_name(0)

        ct2_dir = ensure_ct2_model(hf_id)
        model = WhisperModel(str(ct2_dir), device=device, compute_type=compute_type)

        start = time.perf_counter()
        segments, info = model.transcribe(
            audio_path,
            language=ARMENIAN_LANGUAGE_CODE,  # force Armenian; no autodetect
            task="transcribe",  # never "translate" — output must stay Armenian
            beam_size=5,
        )
        transcript = "".join(segment.text for segment in segments).strip()
        elapsed = time.perf_counter() - start

        result.transcript = transcript
        result.audio_duration_sec = info.duration
        result.processing_time_sec = elapsed
        result.real_time_factor = (
            elapsed / info.duration if info.duration else None
        )
        result.ok = True
    except Exception as exc:  # benchmark tool: surface the error, don't crash the run
        result.error = f"{type(exc).__name__}: {exc}"
    finally:
        # Explicit unload before the next model is loaded (resource-safety requirement).
        del model
        gc.collect()
        try:
            import torch

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass

    return result
