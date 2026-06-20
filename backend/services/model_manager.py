import torch
import gc
from threading import Lock
from qwen_tts import Qwen3TTSModel

class ModelManager:
    def __init__(self):
        self.model = None
        self.current_model_type = None
        self.lock = Lock()
        
    def switch_model(self, target_type: str):
        with self.lock:
            if self.current_model_type == target_type and self.model is not None:
                return
                
            print(f"Switching model to {target_type}...")
            
            if self.model is not None:
                self.model = None
                gc.collect()
                
            model_path = "Qwen/Qwen3-TTS-12Hz-0.6B-Base" if target_type == "Base" else "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
            
            model = Qwen3TTSModel.from_pretrained(
                model_path,
                low_cpu_mem_usage=True,
                dtype=torch.bfloat16,
                attn_implementation="sdpa"
            )
            
            self.model = model
            self.current_model_type = target_type
            print("Model swapped successfully.")

    def get_model_and_lock(self):
        return self.model, self.lock

# Global singleton
model_manager = ModelManager()
