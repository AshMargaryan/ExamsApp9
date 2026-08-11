# Armenian Voice Benchmark (dev tool, not production code)

Standalone tool to evaluate Armenian speech-to-text and text-to-speech
candidates before any voice feature is integrated into the real AI
assistant. Lives outside `backend/` and `frontend/` on purpose: it has its
own Python venv, its own dependencies, and its own tiny server. It does not
touch the Django app, the chat API, auth, the database, or docker-compose.

Status: scaffolding only (Phase 1). STT/TTS implementation lands in later
phases; this file will be filled in with actual benchmark results and a
production recommendation once those runs happen.

## Layout

- `server/` — FastAPI app (STT model loading/inference, Azure TTS calls)
- `static/` — single-page benchmark UI (plain HTML/JS, no build step)
- `requirements.txt` — isolated dependency set (torch, ctranslate2,
  faster-whisper, transformers, azure-cognitiveservices-speech, fastapi)
- `.env.example` — copy to `.env`; see below

## Setup (once implemented)

```bash
cd voice_benchmark
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Running

```bash
uvicorn server.main:app --reload --port 8100
```

Then open `static/index.html` (served by the same app) in a browser.
