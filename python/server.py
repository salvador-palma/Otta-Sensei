"""
server.py — keeps the recognizers loaded and serves pronunciation analysis.

Loading the models takes several seconds, so it happens once at startup instead
of on every request. The Next.js route /api/pronounce forwards uploads here.
Models are mixed per phoneme: the flap ɾ is judged by the fine-tuned XLSR,
everything else by Hubert (see PHONEME_MODEL in analyze.py).

    python python/server.py            (or: npm run analyzer)

Env: ANALYZER_HOST (default 127.0.0.1), ANALYZER_PORT (default 8000),
     XLSR_MODEL_DIR (default python/models/xlsr-jp-us-ipa)
"""

import os
import shutil
import tempfile
import threading
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

from analyze import Analyze, BuildGroundTruth, LoadHubert, LoadModel, HUBERT_MODEL_ID, MODEL_DIR

# One inference at a time; parallel requests would just compete for the CPU/GPU.
_inference_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print(f"Loading XLSR model from {MODEL_DIR} ...", flush=True)
    LoadModel()
    print(f"Loading Hubert model {HUBERT_MODEL_ID} ...", flush=True)
    LoadHubert()
    print("Models loaded.", flush=True)
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(audio: UploadFile = File(...), sentence: str = Form(...), ipa: str = Form(...),
            feature: str | None = Form(None)):
    # Validate the transcription first so a malformed DB row fails fast and clearly.
    try:
        BuildGroundTruth(sentence, ipa)
    except ValueError as e:
        return JSONResponse({"error": f"Bad IPA transcription: {e}"}, status_code=422)

    tmp_dir = tempfile.mkdtemp(prefix="otta-speak-")
    audio_path = os.path.join(tmp_dir, audio.filename or "utterance.webm")
    try:
        with open(audio_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        with _inference_lock:
            return Analyze(audio_path, sentence, ipa, feature)
    except Exception as e:
        return JSONResponse({"error": f"Analysis failed: {e}"}, status_code=500)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.environ.get("ANALYZER_HOST", "127.0.0.1"),
        port=int(os.environ.get("ANALYZER_PORT", "8000")),
    )
