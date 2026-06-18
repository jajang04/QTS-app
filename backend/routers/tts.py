from fastapi import APIRouter, Form, HTTPException, File, UploadFile
from fastapi.responses import FileResponse
import os
import uuid
import gc

from services.audio_processor import process_custom_voice, process_voice_clone
from services.transcription import transcriber

router = APIRouter(tags=["TTS Generation"])

@router.post("/generate_custom_voice")
def generate_custom_voice(
    text: str = Form(...),
    language: str = Form("Auto"),
    speaker: str = Form("Vivian"),
    instruct: str = Form(""),
    audio_format: str = Form("wav")
):
    print(f"Generating voice for: {text[:50]}... (CPU)")
    try:
        valid_formats = ["wav", "flac", "ogg"]
        fmt = audio_format.lower() if audio_format.lower() in valid_formats else "wav"
        
        output_path = process_custom_voice(text, language, speaker, instruct, fmt)
        
        media_types = {"wav": "audio/wav", "flac": "audio/flac", "ogg": "audio/ogg"}
        return FileResponse(output_path, media_type=media_types[fmt])
    except Exception as e:
        print(f"Error during generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@router.post("/generate_voice_clone")
def generate_voice_clone(
    text: str = Form(...),
    ref_audio: UploadFile = File(None),
    ref_text: str = Form(""),
    audio_format: str = Form("wav"),
    x_vector_only_mode: bool = Form(False),
    saved_voice_id: str = Form("")
):
    temp_ref_path = None
    if ref_audio is not None and not saved_voice_id:
        temp_ref_path = f"outputs/temp_ref_{uuid.uuid4()}.wav"
        with open(temp_ref_path, "wb") as f:
            f.write(ref_audio.file.read())
        
    try:
        valid_formats = ["wav", "flac", "ogg"]
        fmt = audio_format.lower() if audio_format.lower() in valid_formats else "wav"
        
        output_path = process_voice_clone(
            text=text, 
            temp_ref_path=temp_ref_path, 
            ref_text=ref_text, 
            fmt=fmt,
            x_vector_only_mode=x_vector_only_mode,
            saved_voice_id=saved_voice_id if saved_voice_id else None
        )
        
        media_types = {"wav": "audio/wav", "flac": "audio/flac", "ogg": "audio/ogg"}
        return FileResponse(output_path, media_type=media_types[fmt])
    except Exception as e:
        print(f"Error during cloning: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_ref_path and os.path.exists(temp_ref_path):
            os.remove(temp_ref_path)
        gc.collect()

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
