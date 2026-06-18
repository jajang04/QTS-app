import os
import gc
import hashlib
import re
import uuid
import numpy as np
import torch
import soundfile as sf
from .model_manager import model_manager

os.makedirs("outputs/saved_voices", exist_ok=True)

def get_cached_path(hash_input: str, fmt: str):
    file_hash = hashlib.sha256(hash_input.encode()).hexdigest()
    output_path = f"outputs/{file_hash}.{fmt}"
    if os.path.exists(output_path):
        return output_path, file_hash
    return output_path, None

def process_custom_voice(text: str, language: str, speaker: str, instruct: str, fmt: str):
    hash_input = f"{text}|{language}|{speaker}|{instruct}|{fmt}"
    output_path, cached_hash = get_cached_path(hash_input, fmt)
    
    if cached_hash:
        print(f"Cache hit! Returning cached audio for: {cached_hash}")
        return output_path

    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "CustomVoice":
        raise ValueError("CustomVoice model is not loaded. Please switch models.")

    chunks = [c.strip() for c in re.split(r'(?<=[.!?])\s+', text) if c.strip()]
    if not chunks:
        chunks = [text]

    all_wavs = []
    final_sr = 24000
    
    with lock:  # Thread-Safety lock
        with torch.no_grad():
            for chunk in chunks:
                wavs, sr = model.generate_custom_voice(
                    text=chunk,
                    language=language,
                    speaker=speaker,
                    instruct=instruct if instruct else "",
                )
                all_wavs.append(wavs[0])
                final_sr = sr

    final_wav = np.concatenate(all_wavs, axis=0)
    sf.write(output_path, final_wav, final_sr, format=fmt.upper())
    return output_path

def save_custom_voice(temp_ref_path: str, ref_text: str, name: str, x_vector_only_mode: bool):
    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "Base":
        raise ValueError("Base model not loaded. Please switch to Voice Clone mode first.")
    
    with lock:
        with torch.no_grad():
            prompt_items = model.create_voice_clone_prompt(
                ref_audio=temp_ref_path,
                ref_text=ref_text if not x_vector_only_mode else None,
                x_vector_only_mode=x_vector_only_mode
            )
            
    safe_name = "".join([c for c in name if c.isalnum() or c == ' ']).strip()
    if not safe_name:
        safe_name = str(uuid.uuid4())
    
    save_path = f"outputs/saved_voices/{safe_name.replace(' ', '_')}.pt"
    torch.save(prompt_items, save_path)
    return safe_name

def get_saved_voices():
    voices = []
    for file in os.listdir("outputs/saved_voices"):
        if file.endswith(".pt"):
            voices.append(file.replace(".pt", "").replace("_", " "))
    return voices

def process_voice_clone(text: str, temp_ref_path: str, ref_text: str, fmt: str, x_vector_only_mode: bool = False, saved_voice_id: str = None):
    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "Base":
        raise ValueError("Base model not loaded. Please switch to Voice Clone mode first.")
        
    file_id = str(uuid.uuid4())
    output_path = f"outputs/{file_id}.{fmt}"
    
    with lock:  # Thread-Safety lock
        with torch.no_grad():
            if saved_voice_id:
                safe_name = saved_voice_id.replace(" ", "_")
                load_path = f"outputs/saved_voices/{safe_name}.pt"
                if not os.path.exists(load_path):
                    raise ValueError("Saved voice not found.")
                prompt_items = torch.load(load_path, weights_only=False)
                wavs, sr = model.generate_voice_clone(
                    text=text,
                    voice_clone_prompt=prompt_items
                )
            else:
                wavs, sr = model.generate_voice_clone(
                    text=text,
                    ref_audio=temp_ref_path,
                    ref_text=ref_text if not x_vector_only_mode else None,
                    x_vector_only_mode=x_vector_only_mode
                )
            
    sf.write(output_path, wavs[0], sr, format=fmt.upper())
    return output_path
