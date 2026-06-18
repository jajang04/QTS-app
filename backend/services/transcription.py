import gc
import librosa
from transformers import pipeline

class TranscriptionService:
    def __init__(self):
        self.pipe = None

    def _load_model(self):
        if self.pipe is None:
            print("Loading Whisper-tiny model on CPU for transcription...")
            # We use openai/whisper-tiny which is small and fast.
            # Using chunk_length_s to handle long audio just in case, though mic clips are short.
            self.pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny", device="cpu")

    def transcribe(self, audio_path: str) -> str:
        self._load_model()
        
        try:
            print(f"Transcribing audio from {audio_path}...")
            # Load audio at 16kHz using librosa (which uses soundfile natively for WAV, bypassing ffmpeg)
            audio_array, sr = librosa.load(audio_path, sr=16000)
            
            result = self.pipe({"array": audio_array, "sampling_rate": sr}, generate_kwargs={"task": "transcribe"})
            text = result.get("text", "").strip()
            print(f"Transcription result: {text}")
            return text
        finally:
            # Optionally we could delete self.pipe here, but keeping it loaded might be better 
            # if they record multiple times. Since RAM is 8GB, whisper-tiny takes ~150MB, 
            # we can keep it in memory. We just force gc.collect() to clean up intermediate tensors.
            gc.collect()

# Singleton instance
transcriber = TranscriptionService()
