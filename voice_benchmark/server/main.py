"""
FastAPI app for the Armenian voice benchmark. Standalone: no dependency on
the Django backend, no shared database, no auth. Run with:

    uvicorn server.main:app --reload --port 8100

from inside voice_benchmark/.
"""
from __future__ import annotations

import os
import shutil
import tempfile
from dataclasses import asdict
from pathlib import Path

import psutil
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from fastapi.staticfiles import StaticFiles

load_dotenv()

from .azure_stt import transcribe_with_azure  # noqa: E402
from .stt import ARMENIAN_MODELS, run_single_model  # noqa: E402  (after load_dotenv)
from .tts import ARMENIAN_TTS_VOICES, azure_tts_configured, synthesize_speech  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
TMP_AUDIO_DIR = BASE_DIR / "tmp_audio"
TMP_AUDIO_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Armenian Voice Benchmark")


@app.get("/api/health")
def health() -> dict:
    gpu_available = False
    gpu_name = None
    try:
        import torch

        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    return {
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "cpu_count": psutil.cpu_count(logical=True),
        "ram_total_gb": round(psutil.virtual_memory().total / (1024**3), 1),
        "ram_available_gb": round(psutil.virtual_memory().available / (1024**3), 1),
        "azure_tts_configured": azure_tts_configured(),
        "azure_tts_voices": ARMENIAN_TTS_VOICES,
    }


@app.post("/api/stt/benchmark")
async def stt_benchmark(audio: UploadFile = File(...)) -> dict:
    suffix = Path(audio.filename or "audio").suffix or ".webm"
    with tempfile.NamedTemporaryFile(
        dir=TMP_AUDIO_DIR, suffix=suffix, delete=False
    ) as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name

    try:
        results = []
        # Sequential on purpose: Model A (large-v3-turbo) fully loads, runs,
        # and unloads before Model B (small) ever loads. See stt.py docstring.
        # Each call is pushed to a worker thread (run_in_threadpool) because
        # faster-whisper/ctranslate2 are synchronous, CPU-bound calls that
        # would otherwise block the single asyncio event loop and freeze
        # every other request (including just loading the page) for the
        # whole duration of model download/conversion/transcription.
        for model_key, hf_id in ARMENIAN_MODELS.items():
            result = await run_in_threadpool(run_single_model, hf_id, model_key, tmp_path)
            results.append(asdict(result))

        # Model C: Azure cloud STT, same credentials as the TTS test. Only
        # attempted if configured, so the benchmark still works STT-only.
        if azure_tts_configured():
            azure_result = await run_in_threadpool(transcribe_with_azure, tmp_path)
            results.append(asdict(azure_result))

        return {"results": results}
    finally:
        os.unlink(tmp_path)  # don't retain uploaded test audio


@app.post("/api/stt/transcribe")
async def stt_transcribe(audio: UploadFile = File(...)) -> dict:
    """Production-facing endpoint: small_v2 only, not the full 3-way benchmark.

    Called by the real Django AI assistant (backend/apps/ai_assistant), not
    by the benchmark UI. Large-v3-turbo and Azure are benchmark-only — they
    were dramatically slower/costlier in testing, and running all three per
    request would make voice input in the real app unusably slow.
    """
    suffix = Path(audio.filename or "audio").suffix or ".webm"
    with tempfile.NamedTemporaryFile(
        dir=TMP_AUDIO_DIR, suffix=suffix, delete=False
    ) as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name

    try:
        result = await run_in_threadpool(
            run_single_model, ARMENIAN_MODELS["small_v2"], "small_v2", tmp_path
        )
        if not result.ok:
            raise HTTPException(status_code=502, detail=result.error or "Transcription failed")
        return asdict(result)
    finally:
        os.unlink(tmp_path)


@app.post("/api/tts/synthesize")
async def tts_synthesize(text: str = Form(...), voice: str = Form(None)) -> FileResponse:
    if not azure_tts_configured():
        raise HTTPException(
            status_code=400,
            detail="Azure TTS not configured. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.",
        )

    result = await run_in_threadpool(synthesize_speech, text, TMP_AUDIO_DIR, voice or None)
    if not result.ok or not result.audio_path:
        raise HTTPException(status_code=502, detail=result.error or "TTS synthesis failed")

    return FileResponse(
        result.audio_path,
        media_type="audio/wav",
        filename="tts_output.wav",
        background=BackgroundTask(os.unlink, result.audio_path),
        headers={
            "X-Processing-Time-Sec": str(round(result.processing_time_sec, 3)),
            "X-Voice": result.voice,
        },
    )


# Serve the plain-HTML/JS benchmark UI. Mounted last so it doesn't shadow /api routes.
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
