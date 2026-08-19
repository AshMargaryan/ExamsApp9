"""
OpenAI Speech (STT + TTS) for the Armenian voice benchmark.

Production path for the real app (backend/apps/ai_assistant) — replaces the
local small_v2 Whisper model (STT) and Azure Speech (TTS) that were used
before. faster-whisper/local models and Azure stay in stt.py/azure_stt.py/
tts.py for benchmark comparison only; they are no longer on the production
request path.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .stt import ARMENIAN_LANGUAGE_CODE, TranscriptionResult

OPENAI_API_KEY = None  # set lazily in _client() so a missing key doesn't crash import
OPENAI_STT_MODEL = "gpt-4o-mini-transcribe"
OPENAI_TTS_MODEL = "gpt-4o-mini-tts"
OPENAI_TTS_VOICE = "nova"

# Voices the production app can pick between (frontend passes one of these).
OPENAI_TTS_VOICES = ["nova", "onyx"]


def _api_key() -> str:
    import os

    return os.environ.get("OPENAI_API_KEY", "")


def openai_configured() -> bool:
    return bool(_api_key())


def _client():
    from openai import OpenAI

    return OpenAI(api_key=_api_key())


def transcribe_with_openai(audio_path: str) -> TranscriptionResult:
    result = TranscriptionResult(
        model_key="openai_gpt4o_mini_transcribe",
        hf_id=OPENAI_STT_MODEL,
        device="openai-cloud",
        compute_type="n/a",
    )

    if not openai_configured():
        result.error = "OPENAI_API_KEY not set"
        return result

    try:
        client = _client()
        start = time.perf_counter()
        with open(audio_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model=OPENAI_STT_MODEL,
                file=audio_file,
                language=ARMENIAN_LANGUAGE_CODE,
            )
        elapsed = time.perf_counter() - start

        result.transcript = (transcription.text or "").strip()
        result.processing_time_sec = elapsed
        result.ok = True
    except Exception as exc:  # surface the error, don't crash the request
        result.error = f"{type(exc).__name__}: {exc}"

    return result


@dataclass
class SynthesisResult:
    ok: bool = False
    audio_path: Optional[str] = None
    voice: str = OPENAI_TTS_VOICE
    processing_time_sec: float = 0.0
    error: Optional[str] = None


def synthesize_with_openai(text: str, out_dir: Path, voice: Optional[str] = None) -> SynthesisResult:
    """Synthesize `text` to a .wav file under `out_dir`. Caller deletes the file."""
    result = SynthesisResult(voice=voice or OPENAI_TTS_VOICE)

    if not openai_configured():
        result.error = "OPENAI_API_KEY not set"
        return result

    out_path = out_dir / f"tts_{int(time.time() * 1000)}.wav"

    try:
        client = _client()
        start = time.perf_counter()
        with client.audio.speech.with_streaming_response.create(
            model=OPENAI_TTS_MODEL,
            voice=result.voice,
            input=text,
            response_format="wav",
        ) as response:
            response.stream_to_file(str(out_path))
        elapsed = time.perf_counter() - start

        result.ok = True
        result.audio_path = str(out_path)
        result.processing_time_sec = elapsed
    except Exception as exc:
        result.error = f"{type(exc).__name__}: {exc}"

    return result
