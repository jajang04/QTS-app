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

def background_batch_process(batch_id: str, texts: list, clone_mode: bool, kwargs: dict):
    for text in texts:
        try:
            if clone_mode:
                process_voice_clone(text=text, batch_id=batch_id, **kwargs)
            else:
                process_custom_voice(text=text, batch_id=batch_id, **kwargs)
        except Exception as e:
            print(f"Batch generation error on text '{text[:20]}': {e}")
            continue
        finally:
            gc.collect()

@router.post("/batch_generate")
def batch_generate(
    background_tasks: BackgroundTasks,
    texts: str = Form(...), # JSON string list of texts
    clone_mode: bool = Form(False),
    
    # Custom Voice args
    language: str = Form("Auto"),
    speaker: str = Form("Vivian"),
    instruct: str = Form(""),
    
    # Clone args
    ref_audio: UploadFile = File(None),
    ref_text: str = Form(""),
    x_vector_only_mode: bool = Form(False),
    saved_voice_id: str = Form(""),
    
    # Shared args
    audio_format: str = Form("wav"),
    preset: bool = Form(False),
    reverb: float = Form(0.0),
    denoise: float = Form(0.0),
    eq: float = Form(0.0)
):
    text_list = json.loads(texts)
    batch_id = f"batch_{uuid.uuid4().hex[:8]}"
    
    temp_ref_path = None
    if clone_mode and ref_audio is not None and not saved_voice_id:
        temp_ref_path = f"outputs/temp_ref_batch_{uuid.uuid4()}.wav"
        with open(temp_ref_path, "wb") as f:
            f.write(ref_audio.file.read())
            
    valid_formats = ["wav", "flac", "ogg"]
    fmt = audio_format.lower() if audio_format.lower() in valid_formats else "wav"

    kwargs = {
        "fmt": fmt,
        "preset": preset,
        "reverb": reverb,
        "denoise": denoise,
        "eq": eq
    }
    
    if clone_mode:
        kwargs.update({
            "temp_ref_path": temp_ref_path,
            "ref_text": ref_text,
            "x_vector_only_mode": x_vector_only_mode,
            "saved_voice_id": saved_voice_id if saved_voice_id else None
        })
    else:
        kwargs.update({
            "language": language,
            "speaker": speaker,
            "instruct": instruct
        })
        
    background_tasks.add_task(background_batch_process, batch_id, text_list, clone_mode, kwargs)
    return {"status": "processing", "batch_id": batch_id, "items": len(text_list)}

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
