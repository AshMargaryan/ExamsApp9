# Armenian Voice Benchmark (dev tool, not production code)

Standalone tool to evaluate Armenian speech-to-text and text-to-speech
candidates before any voice feature is integrated into the real AI
assistant. Lives outside `backend/` and `frontend/` on purpose: it has its
own Python venv, its own dependencies, and its own tiny server. It does not
touch the Django app, the chat API, auth, the database, or docker-compose.

Status: STT (both models) and TTS (both Azure voices) are implemented and
working. What's still missing is *your* real-world test data — run the STT
and TTS sections below with your own voice/samples and fill in the results
table near the bottom so the recommendation reflects actual accuracy, not
guesses.

## Layout

- `server/` — FastAPI app: `stt.py` (CTranslate2 conversion + sequential
  inference for both Armenian Whisper models), `tts.py` (Azure Speech calls
  for hy-AM-AnahitNeural / hy-AM-HaykNeural), `main.py` (routes + static
  file serving)
- `static/index.html` — single-page benchmark UI (plain HTML/JS, no build
  step, no framework)
- `requirements.txt` — isolated dependency set (torch, ctranslate2,
  faster-whisper, transformers, azure-cognitiveservices-speech, fastapi)
- `.env.example` — copy to `.env`; see below
- `model_cache/` (gitignored) — converted CTranslate2 models, created on
  first use, reused after that (no re-download/re-convert on restart)

## Setup

```bash
cd voice_benchmark
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Running

```bash
source venv/bin/activate
uvicorn server.main:app --host 0.0.0.0 --port 8100
```

Open http://127.0.0.1:8100 — the same FastAPI app serves the UI.

`--host 0.0.0.0` (not the default `127.0.0.1`) is required so the Django
backend running in Docker can reach this service via
`host.docker.internal:8100` (see `docker-compose.yml`'s `extra_hosts` on the
`backend` service and `VOICE_SERVICE_URL`). This is fine for local dev — the
service has no auth and isn't meant to be exposed beyond your own machine;
don't run it this way anywhere network-reachable by others.

## OpenAI credentials (production path)

`/api/stt/transcribe` and `/api/tts/synthesize` — the two endpoints the real
Django app calls — use OpenAI (`gpt-4o-mini-transcribe` for STT,
`gpt-4o-mini-tts` for TTS), not Azure or the local Whisper models. Without
`OPENAI_API_KEY` set, both return an error explaining what to set.

1. Get a key at platform.openai.com.
2. Add it to `voice_benchmark/.env`:
   ```
   OPENAI_API_KEY=<your key>
   ```
3. Restart the server.

Read from environment variables only (via `python-dotenv`), following the
same `KEY=` / `.env` convention as `backend/.env.example` — never
hard-coded, never sent to the browser. The browser only ever receives the
generated audio bytes from `/api/tts/synthesize`; the key never leaves the
server process.

## Azure TTS credentials (benchmark-only)

`AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` are only used by
`/api/stt/benchmark` (as a third comparison model) and are no longer on the
production request path. Without them, `/api/stt/benchmark` still runs with
just the two local Whisper models, and the TTS benchmark section explains
what to set. To enable it:

1. Create (or reuse) an Azure Speech resource in the Azure portal.
2. Copy its key and region into `voice_benchmark/.env`:
   ```
   AZURE_SPEECH_KEY=<your key>
   AZURE_SPEECH_REGION=<e.g. westeurope>
   ```
3. Restart the server.

## Running an STT test

1. Open the page, either click **Record** (browser mic via
   `MediaRecorder`, needs mic permission) or choose a file (wav/mp3/m4a/webm)
   with **Choose file**.
2. Click **Run STT benchmark**. This calls `/api/stt/benchmark`, which runs
   the two models **sequentially, never concurrently**:
   Model A (large-v3-turbo) loads → transcribes → unloads → memory is
   cleared → Model B (small-v2) loads → transcribes → unloads. This is
   deliberate resource management, not a performance optimization — the
   two models are never in memory at the same time.
3. Both models are forced to `language="hy"` / `task="transcribe"` (never
   auto-detect, never translate) so the output stays Armenian.
4. You'll see, per model: transcript, audio duration, processing time,
   real-time factor (processing time ÷ audio duration — lower is better,
   `< 1.0` means faster than real time), device/compute type, and any error.
5. Uploaded audio is written to `tmp_audio/` only for the duration of the
   request and deleted immediately after (success or failure) — nothing is
   retained.

First run per model does the one-time HF checkpoint download + CTranslate2
conversion (this is why the model cache is on disk — subsequent runs skip
straight to loading the cached `model.bin`).

## Running a TTS test

1. Pick one of the five preset Armenian sentences (general conversation,
   math, physics, a longer AI-tutor-style multi-sentence explanation, and
   Armenian mixed with English technical terms) or write your own — this
   matters more than reading isolated words, since it's meant to sound
   like what the AI tutor will actually say.
2. Pick a voice (hy-AM-AnahitNeural or hy-AM-HaykNeural) and click
   **Synthesize**, or click **Synthesize with both voices** to generate the
   same text with both and compare them back-to-back.
3. Each result is a playable `<audio>` element plus the server-reported
   processing time.

## What to record for the comparison

For STT, for each test clip: which model's transcript is actually closer to
what was said (word errors, missed endings, wrong homophones are common
Armenian Whisper failure modes), and the real-time factor on this machine's
CPU. For TTS: which voice sounds more natural / less robotic on the
AI-tutor-style paragraph specifically (not just short sentences), and
whether either voice mispronounces math/physics terms or the mixed
Armenian/English text badly enough to be distracting.

## Machine specs observed during this benchmark

- CPU: 8 logical cores, no GPU (`torch.cuda.is_available()` is `False`) —
  everything below is CPU-only inference, `compute_type="int8"`.
- RAM: ~15 GB total.
- Large-v3-turbo converted CTranslate2 model: ~784 MB on disk (int8).
- Small-v2 converted CTranslate2 model: comparable, several hundred MB.

*(Timing numbers for actual transcription runs go here once you've run
real samples through the UI — see the results template below.)*

## Results template (fill in after testing)

| Sample | Model A (large-v3-turbo) transcript | A: time / RTF | Model B (small-v2) transcript | B: time / RTF | Notes |
|---|---|---|---|---|---|
| clip1.wav | | | | | |
| clip2.wav | | | | | |

| Voice | Sentence category | Sounds natural? | Mispronunciations | Notes |
|---|---|---|---|---|
| Anahit | AI-tutor explanation | | | |
| Hayk | AI-tutor explanation | | | |

## Resource / scaling analysis

**Model sizes.** Large-v3-turbo-armenian and small-armenian-v2 are
fine-tunes of Whisper's large-v3-turbo (~809M params) and small (~244M
params) checkpoints respectively. Converted to CTranslate2 int8, Large is
~784 MB on disk; Small is roughly a third of that. RAM footprint while
loaded follows roughly the same ratio, plus CTranslate2/PyTorch overhead.

**CPU inference (this machine, int8, no GPU).** faster-whisper's CTranslate2
int8 kernels make CPU inference for Small comfortably faster than real
time; Large-v3-turbo is noticeably slower per second of audio but still
generally usable for short clips on 8 cores. Exact real-time factors for
*your* audio are in the results table above — that's the number to trust
over this general statement.

**GPU inference.** Not available on this dev machine, so not benchmarked
here. If a CUDA GPU is used in production, both models would run
substantially faster (`compute_type="float16"`, already wired up in
`stt.py`'s `_device_and_compute_type()` — it auto-detects and uses GPU if
present, CPU otherwise).

**Accuracy vs. size.** Large-v3-turbo is expected to be more accurate on
natural, fast, or accented Eastern Armenian speech (it's a much larger base
model) — but confirm this against the results table, since a fine-tuned
Small model can sometimes surprise you.

## Total users vs. concurrent voice requests

~10,000 *registered* users does **not** mean 10,000 simultaneous inference
requests. The number that actually matters for local inference capacity is
**concurrent voice requests** — how many transcriptions or syntheses are
in flight at the same literal moment — which is a small fraction of total
or even active users, since a single voice interaction (record → send →
transcribe → respond) only occupies a server-side worker for a few seconds.

Rough mental model:
- **Total users** (10,000): irrelevant to server sizing directly.
- **Active users** (people using the app in a given day/hour): maybe a few
  hundred to low thousands, depending on the product's usage pattern.
- **Concurrent voice requests** (people mid-transcription at the same
  instant): realistically single digits to low tens, even with a few
  thousand active users, because a voice turn is short and requests spread
  out over time rather than landing simultaneously.
- **Model workers**: one loaded model instance can only process one
  request at a time (or a small batch) before the next request queues.
  This is the actual scaling knob — not total or active user count.

## What would need to change at different concurrency levels

- **~10 simultaneous voice requests**: a single CPU worker process running
  the Small model would likely queue but stay usable (each request only
  takes a few seconds); Large would queue more visibly. One dedicated
  process per model, not per-request model loading, is the key change from
  this benchmark's current one-shot script.
- **~100 simultaneous**: CPU alone becomes a bottleneck regardless of model
  size; this is the point where a GPU worker (or a small pool of them)
  becomes worth the cost, plus a request queue so bursts don't pile up
  in memory. Still doesn't need Redis/Celery-scale infrastructure — a
  simple worker pool suffices, but *some* queueing is needed.
- **~1,000 simultaneous**: local self-hosted inference on a handful of
  GPUs likely stops being the economical choice compared to a managed
  cloud STT API that scales elastically; this is squarely a "hybrid" or
  "paid cloud" territory rather than "add more boxes."

## Production recommendation

*(To be finalized once the results table above has real numbers — see
below for how the decision should be framed.)*

The choice among the four options should follow directly from the
benchmark, not be assumed in advance:

- **A. Large Armenian Whisper locally** — if Large is meaningfully more
  accurate on real speech *and* the real-time factor stays reasonable on
  available hardware, use it, but on a dedicated worker (GPU if concurrency
  ever grows past casual testing) rather than loaded ad hoc per request —
  the load/transcribe/unload cycle used in this benchmark is fine for
  side-by-side comparison, not for a live product.
- **B. Small Armenian Whisper locally** — if accuracy is close enough to
  Large for the tutor's use case (mostly clear, deliberate speech from
  students, not noisy real-world audio) and it's meaningfully faster/lighter,
  it's the lower-cost, easier-to-scale-on-CPU choice.
- **C. Paid cloud STT** — if neither local Armenian model is accurate
  enough on real classroom-style audio, and no comparable-quality cloud
  Armenian STT alternative is dramatically better, this is a fallback, not
  a first choice, given Armenian is a lower-resource language for most
  cloud STT vendors.
- **D. Hybrid** — e.g. Small locally for low-latency common cases,
  falling back to Large (or cloud) for longer/harder audio, or Large on a
  GPU worker reserved for cases where accuracy matters most (e.g. graded
  answers) vs. Small for casual back-and-forth. Worth considering once
  actual accuracy/latency numbers are in, not before.

For TTS, the choice between hy-AM-AnahitNeural and hy-AM-HaykNeural is a
subjective listening decision — there's no accuracy metric to benchmark,
just: which one sounds better reading AI-tutor-style Armenian explanations,
including math/physics terminology and mixed Armenian/English text. Use
the "Synthesize with both voices" button in the UI to compare directly.
