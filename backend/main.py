import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import torch

from services.model_manager import model_manager
from routers import tts, voice_library, models

app = FastAPI(title="Qwen-TTS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optimize PyTorch CPU Threading
torch.set_num_threads(4)

@app.on_event("startup")
async def startup_event():
    print("Loading Qwen-TTS 0.6B CustomVoice model on CPU. This may take a while...")
    try:
        model_manager.switch_model("CustomVoice")
    except Exception as e:
        print(f"Failed to load model: {e}")

os.makedirs("outputs", exist_ok=True)

import json

@app.get("/api/changelog")
def get_changelog():
    path = os.path.join(os.path.dirname(__file__), "..", "changelog.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"releases": []}

app.include_router(tts.router, prefix="/api")
app.include_router(voice_library.router, prefix="/api")
app.include_router(models.router, prefix="/api")
