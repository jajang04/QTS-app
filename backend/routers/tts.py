from fastapi import APIRouter, Form, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
import os
import uuid
import gc
import json

from services.audio_processor import (
    process_custom_voice, process_custom_voice_stream,
    process_voice_clone, process_voice_clone_stream
)
from services.transcription import transcriber

router = APIRouter(tags=["TTS Generation"])

@router.post("/generate_custom_voice")
def generate_custom_voice(
    text: str = Form(...),
    language: str = Form("Auto"),
    speaker: str = Form("Vivian"),
    instruct: str = Form(""),
    preset: bool = Form(False),
    reverb: float = Form(0.0),
    denoise: float = Form(0.0),
    eq: float = Form(0.0)
):
    print(f"Generating voice stream for: {text[:50]}... (CPU)")
    try:
        generator = process_custom_voice_stream(
            text, language, speaker, instruct, preset, reverb, denoise, eq
        )
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        print(f"Error during streaming generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_voice_clone")
def generate_voice_clone(
    text: str = Form(...),
    ref_audio: UploadFile = File(None),
    ref_text: str = Form(""),
    x_vector_only_mode: bool = Form(False),
    saved_voice_id: str = Form(""),
    preset: bool = Form(False),
    reverb: float = Form(0.0),
    denoise: float = Form(0.0),
    eq: float = Form(0.0)
):
    temp_ref_path = None
    if ref_audio is not None and not saved_voice_id:
        temp_ref_path = f"outputs/temp_ref_{uuid.uuid4()}.wav"
        with open(temp_ref_path, "wb") as f:
            f.write(ref_audio.file.read())
        
    try:
        generator = process_voice_clone_stream(
            text, temp_ref_path, ref_text, x_vector_only_mode, saved_voice_id, preset, reverb, denoise, eq
        )
        # Note: temp_ref_path deletion should ideally happen after the stream ends.
        # But for simplicity in generators, it might be left in outputs/ or cleaned up later.
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        if temp_ref_path and os.path.exists(temp_ref_path):
            os.remove(temp_ref_path)
        print(f"Error during streaming cloning: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
def transcribe_audio(audio: UploadFile = File(...)):
    temp_path = f"outputs/temp_transcribe_{uuid.uuid4()}.wav"
    with open(temp_path, "wb") as f:
        f.write(audio.file.read())
        
    try:
        text = transcriber.transcribe(temp_path)
        return {"text": text}
    except Exception as e:
        print(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
