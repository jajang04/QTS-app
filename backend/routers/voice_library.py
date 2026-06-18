from fastapi import APIRouter, Form, HTTPException, File, UploadFile
import os
import uuid

from services.audio_processor import save_custom_voice, get_saved_voices

router = APIRouter(tags=["Voice Library"])

@router.get("/saved_voices")
async def get_saved_voices_endpoint():
    return {"saved_voices": get_saved_voices()}

@router.post("/save_custom_voice")
def save_voice_endpoint(
    name: str = Form(...),
    ref_audio: UploadFile = File(...),
    ref_text: str = Form(""),
    x_vector_only_mode: bool = Form(False)
):
    temp_ref_path = f"outputs/temp_save_{uuid.uuid4()}.wav"
    with open(temp_ref_path, "wb") as f:
        f.write(ref_audio.file.read())
        
    try:
        saved_id = save_custom_voice(temp_ref_path, ref_text, name, x_vector_only_mode)
        return {"status": "success", "saved_voice_id": saved_id}
    except Exception as e:
        print(f"Error saving voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_ref_path):
            os.remove(temp_ref_path)
