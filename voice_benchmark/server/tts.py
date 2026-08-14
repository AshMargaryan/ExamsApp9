"""
Azure Speech TTS for the Armenian voice benchmark.

The two Armenian (hy-AM) Azure neural voices under test: hy-AM-AnahitNeural
(female) and hy-AM-HaykNeural (male). The default below is just the
fallback when the frontend doesn't pass `voice` explicitly.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

AZURE_SPEECH_KEY = os.environ.get("AZURE_SPEECH_KEY", "")
AZURE_SPEECH_REGION = os.environ.get("AZURE_SPEECH_REGION", "")
AZURE_TTS_VOICE = os.environ.get("AZURE_TTS_VOICE", "hy-AM-AnahitNeural")

# The two candidate voices the benchmark UI lets you switch between.
ARMENIAN_TTS_VOICES = ["hy-AM-AnahitNeural", "hy-AM-HaykNeural"]


def azure_tts_configured() -> bool:
    return bool(AZURE_SPEECH_KEY and AZURE_SPEECH_REGION)


@dataclass
class SynthesisResult:
    ok: bool = False
    audio_path: Optional[str] = None
    voice: str = AZURE_TTS_VOICE
    processing_time_sec: float = 0.0
    error: Optional[str] = None


def synthesize_speech(text: str, out_dir: Path, voice: Optional[str] = None) -> SynthesisResult:
    """Synthesize `text` to a .wav file under `out_dir`. Caller deletes the file."""
    result = SynthesisResult(voice=voice or AZURE_TTS_VOICE)

    if not azure_tts_configured():
        result.error = "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set"
        return result

    import azure.cognitiveservices.speech as speechsdk

    out_path = out_dir / f"tts_{int(time.time() * 1000)}.wav"

    speech_config = speechsdk.SpeechConfig(
        subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION
    )
    speech_config.speech_synthesis_voice_name = result.voice
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(out_path))
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, audio_config=audio_config
    )

    start = time.perf_counter()
    speech_result = synthesizer.speak_text_async(text).get()
    elapsed = time.perf_counter() - start

    if speech_result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        result.ok = True
        result.audio_path = str(out_path)
        result.processing_time_sec = elapsed
    else:
        details = speechsdk.CancellationDetails(speech_result)
        result.error = f"{speech_result.reason}: {details.reason} {details.error_details or ''}".strip()

    return result
