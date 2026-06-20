from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.model_manager import model_manager

router = APIRouter(tags=["Models & Speakers"])

class SwitchModelRequest(BaseModel):
    model_type: str # "CustomVoice" or "Base"

@router.post("/switch_model")
def switch_model(req: SwitchModelRequest):
    if req.model_type not in ["CustomVoice", "Base"]:
        raise HTTPException(status_code=400, detail="Invalid model type.")
    try:
        model_manager.switch_model(req.model_type)
        return {"status": "success", "message": f"Swapped to {req.model_type}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/speakers")
async def get_speakers():
    return {
        "speakers": [
            {"id": "Vivian", "description": "Bright, slightly edgy young female voice. (Chinese)"},
            {"id": "Serena", "description": "Warm, gentle young female voice. (Chinese)"},
            {"id": "Uncle_Fu", "description": "Seasoned male voice with a low, mellow timbre. (Chinese)"},
            {"id": "Dylan", "description": "Youthful Beijing male voice. (Chinese)"},
            {"id": "Eric", "description": "Lively Chengdu male voice. (Chinese)"},
            {"id": "Ryan", "description": "Dynamic male voice with strong rhythmic drive. (English)"},
            {"id": "Aiden", "description": "Sunny American male voice with a clear midrange. (English)"},
            {"id": "Ono_Anna", "description": "Playful Japanese female voice. (Japanese)"},
            {"id": "Sohee", "description": "Warm Korean female voice with rich emotion. (Korean)"}
        ]
    }
