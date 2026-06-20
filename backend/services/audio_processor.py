import os
import gc
import hashlib
import re
import uuid
import io
import base64
import json
import numpy as np
import torch
import soundfile as sf
import nltk
from pedalboard import Pedalboard, Reverb, NoiseGate, HighpassFilter, PeakFilter
from .model_manager import model_manager

# Ensure NLTK punkt is downloaded
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')

os.makedirs("outputs/saved_voices", exist_ok=True)

def get_cached_path(hash_input: str, fmt: str):
    file_hash = hashlib.sha256(hash_input.encode()).hexdigest()
    output_path = f"outputs/{file_hash}.{fmt}"
    if os.path.exists(output_path):
        return output_path, file_hash
    return output_path, None

def apply_fx(wav, sr, preset=False, reverb=0.0, denoise=0.0, eq=0.0):
    board = Pedalboard([])
    if preset:
        # AI voices are usually already clean. A Studio Preset should just act as a gentle mastering chain
        # to maximize loudness and even out volume spikes, rather than aggressive EQ.
        board.append(Compressor(threshold_db=-15, ratio=3.0, attack_ms=5.0, release_ms=50.0))
        board.append(Limiter(threshold_db=-1.0))
    else:
        if denoise > 0:
            board.append(NoiseGate(threshold_db=-60 + (denoise * 30)))
        if eq > 0:
            board.append(HighpassFilter(cutoff_frequency_hz=80))
            board.append(PeakFilter(cutoff_frequency_hz=3000, gain_db=eq * 5))
        if reverb > 0:
            board.append(Reverb(room_size=0.5, wet_level=reverb * 0.5))
    
    if len(board) > 0:
        if len(wav.shape) == 1:
            wav = np.expand_dims(wav, axis=0)
        effected = board(wav, sr)
        return effected.squeeze()
    return wav

def wav_to_base64(wav, sr):
    buf = io.BytesIO()
    sf.write(buf, wav, sr, format='WAV')
    return base64.b64encode(buf.getvalue()).decode('utf-8')

def chunk_text(text: str):
    try:
        chunks = nltk.sent_tokenize(text)
    except:
        chunks = [c.strip() for c in re.split(r'(?<=[.!?])\s+', text) if c.strip()]
    return [c for c in chunks if c.strip()] or [text]

def process_custom_voice_stream(text: str, language: str, speaker: str, instruct: str, preset: bool=False, reverb: float=0.0, denoise: float=0.0, eq: float=0.0):
    import psutil
    psutil.cpu_percent(interval=None) # Initialize CPU counter

    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "CustomVoice":
        raise ValueError("CustomVoice model is not loaded. Please switch models.")

    chunks = chunk_text(text)
    
    with lock:
        with torch.inference_mode():
            for i, chunk in enumerate(chunks):
                wavs, sr = model.generate_custom_voice(
                    text=chunk,
                    language=language,
                    speaker=speaker,
                    instruct=instruct if instruct else "",
                )
                final_chunk = apply_fx(wavs[0], sr, preset, reverb, denoise, eq)
                b64_audio = wav_to_base64(final_chunk, sr)
                
                is_last = (i == len(chunks) - 1)
                payload = {
                    "audio": b64_audio,
                    "is_last": is_last
                }
                
                if is_last:
                    process = psutil.Process(os.getpid())
                    ram_gb = process.memory_info().rss / (1024 ** 3)
                    cpu_percent = psutil.cpu_percent(interval=None)
                    payload["ram"] = f"{ram_gb:.1f} GB"
                    payload["cpu"] = f"{cpu_percent}%"
                
                yield f"data: {json.dumps(payload)}\n\n"

def process_custom_voice(text: str, language: str, speaker: str, instruct: str, fmt: str, preset: bool=False, reverb: float=0.0, denoise: float=0.0, eq: float=0.0, batch_id: str=None):
    # Fallback for batch processing where streaming isn't needed
    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "CustomVoice":
        raise ValueError("CustomVoice model is not loaded.")

    chunks = chunk_text(text)
    all_wavs = []
    final_sr = 24000
    
    with lock:
        with torch.inference_mode():
            for chunk in chunks:
                wavs, sr = model.generate_custom_voice(
                    text=chunk, language=language, speaker=speaker, instruct=instruct if instruct else ""
                )
                all_wavs.append(wavs[0])
                final_sr = sr

    final_wav = np.concatenate(all_wavs, axis=0)
    final_wav = apply_fx(final_wav, final_sr, preset, reverb, denoise, eq)
    
    output_path = f"outputs/{uuid.uuid4()}.{fmt}"
    sf.write(output_path, final_wav, final_sr, format=fmt.upper())
    return output_path

def process_voice_clone_stream(text: str, temp_ref_path: str, ref_text: str, x_vector_only_mode: bool, saved_voice_id: str, preset: bool=False, reverb: float=0.0, denoise: float=0.0, eq: float=0.0):
    import psutil
    psutil.cpu_percent(interval=None)

    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "Base":
        raise ValueError("Base model not loaded.")

    chunks = chunk_text(text)
    
    with lock:
        with torch.inference_mode():
            if saved_voice_id:
                safe_name = saved_voice_id.replace(" ", "_")
                load_path = f"outputs/saved_voices/{safe_name}.pt"
                if not os.path.exists(load_path):
                    raise ValueError("Saved voice not found.")
                prompt_items = torch.load(load_path, weights_only=False)
            
            for i, chunk in enumerate(chunks):
                if saved_voice_id:
                    wavs, sr = model.generate_voice_clone(text=chunk, voice_clone_prompt=prompt_items)
                else:
                    wavs, sr = model.generate_voice_clone(
                        text=chunk, ref_audio=temp_ref_path, ref_text=ref_text if not x_vector_only_mode else None, x_vector_only_mode=x_vector_only_mode
                    )
                
                final_chunk = apply_fx(wavs[0], sr, preset, reverb, denoise, eq)
                b64_audio = wav_to_base64(final_chunk, sr)
                
                is_last = (i == len(chunks) - 1)
                payload = {"audio": b64_audio, "is_last": is_last}
                
                if is_last:
                    process = psutil.Process(os.getpid())
                    ram_gb = process.memory_info().rss / (1024 ** 3)
                    cpu_percent = psutil.cpu_percent(interval=None)
                    payload["ram"] = f"{ram_gb:.1f} GB"
                    payload["cpu"] = f"{cpu_percent}%"
                    
                yield f"data: {json.dumps(payload)}\n\n"

def process_voice_clone(text: str, temp_ref_path: str, ref_text: str, fmt: str, x_vector_only_mode: bool = False, saved_voice_id: str = None, preset: bool=False, reverb: float=0.0, denoise: float=0.0, eq: float=0.0, batch_id: str=None):
    # Fallback for batch processing
    model, lock = model_manager.get_model_and_lock()
    if model is None or model_manager.current_model_type != "Base":
        raise ValueError("Base model not loaded.")

    chunks = chunk_text(text)
    all_wavs = []
    final_sr = 24000
    
    with lock:
        with torch.inference_mode():
            if saved_voice_id:
                safe_name = saved_voice_id.replace(" ", "_")
                load_path = f"outputs/saved_voices/{safe_name}.pt"
                prompt_items = torch.load(load_path, weights_only=False)
            
            for chunk in chunks:
                if saved_voice_id:
                    wavs, sr = model.generate_voice_clone(text=chunk, voice_clone_prompt=prompt_items)
                else:
                    wavs, sr = model.generate_voice_clone(
                        text=chunk, ref_audio=temp_ref_path, ref_text=ref_text if not x_vector_only_mode else None, x_vector_only_mode=x_vector_only_mode
                    )
                all_wavs.append(wavs[0])
                final_sr = sr

    final_wav = np.concatenate(all_wavs, axis=0)
    final_wav = apply_fx(final_wav, final_sr, preset, reverb, denoise, eq)
    
    output_path = f"outputs/{uuid.uuid4()}.{fmt}"
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
