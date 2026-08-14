"""
Azure Speech-to-Text (Model C in the benchmark): a paid cloud alternative to
the two local Armenian Whisper models, using the same Azure Speech resource
already configured for TTS (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION).
"""
from __future__ import annotations

import os
import subprocess
import tempfile
import time
import wave

from .stt import TranscriptionResult
from .tts import AZURE_SPEECH_KEY, AZURE_SPEECH_REGION

ARMENIAN_STT_LOCALE = "hy-AM"


def _to_wav_16k_mono(src_path: str) -> str:
    """Azure's SDK needs a PCM WAV file; browser recordings arrive as webm/etc."""
    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    subprocess.run(
        ["ffmpeg", "-y", "-i", src_path, "-ar", "16000", "-ac", "1", wav_path],
        check=True,
        capture_output=True,
    )
    return wav_path


def transcribe_with_azure(audio_path: str) -> TranscriptionResult:
    result = TranscriptionResult(
        model_key="azure_stt",
        hf_id="azure-speech-hy-AM (cloud)",
        language=ARMENIAN_STT_LOCALE,
        device="azure-cloud",
        compute_type="n/a",
    )

    if not (AZURE_SPEECH_KEY and AZURE_SPEECH_REGION):
        result.error = "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set"
        return result

    import azure.cognitiveservices.speech as speechsdk

    wav_path = _to_wav_16k_mono(audio_path)
    try:
        with wave.open(wav_path) as wf:
            result.audio_duration_sec = wf.getnframes() / wf.getframerate()

        speech_config = speechsdk.SpeechConfig(
            subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION
        )
        speech_config.speech_recognition_language = ARMENIAN_STT_LOCALE
        audio_config = speechsdk.audio.AudioConfig(filename=wav_path)
        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config, audio_config=audio_config
        )

        start = time.perf_counter()
        # recognize_once(): fine for short benchmark clips (a few seconds up
        # to ~15-20s). A real product would use continuous recognition for
        # longer audio; out of scope for this side-by-side comparison tool.
        speech_result = recognizer.recognize_once()
        elapsed = time.perf_counter() - start
        result.processing_time_sec = elapsed
        result.real_time_factor = (
            elapsed / result.audio_duration_sec if result.audio_duration_sec else None
        )

        if speech_result.reason == speechsdk.ResultReason.RecognizedSpeech:
            result.transcript = speech_result.text
            result.ok = True
        elif speech_result.reason == speechsdk.ResultReason.NoMatch:
            result.ok = True
            result.transcript = ""
        else:
            details = speechsdk.CancellationDetails(speech_result)
            result.error = (
                f"{speech_result.reason}: {details.reason} {details.error_details or ''}".strip()
            )
    except Exception as exc:  # benchmark tool: surface the error, don't crash the run
        result.error = f"{type(exc).__name__}: {exc}"
    finally:
        os.unlink(wav_path)

    return result
