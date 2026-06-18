# Architecture

## Overview
The Qwen-TTS Web App consists of a React (Vite) frontend and a Python (FastAPI) backend. The backend executes Qwen-TTS locally on the CPU (specifically optimized for Intel CPU without CUDA).

## Backend
- **Framework**: FastAPI
- **Model**: `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`
- **Inference Mode**: CPU (`device_map="cpu"`, `dtype=torch.float32`)
- **Endpoints**:
  - `GET /api/speakers`: Returns a list of supported voice actors and their descriptions.
  - `POST /api/generate_custom_voice`: Receives `text`, `language`, `speaker`, and `instruct` (style). It invokes the `generate_custom_voice` method from `Qwen3TTSModel` and returns a `.wav` file response.

## Frontend
- **Framework**: React 18, Vite, TypeScript
- **Design System**: Custom CSS focusing on dark mode, modern typography (Inter font), and aesthetic layout.
- **Features**:
  - Dynamic loading of available speakers.
  - Text input with style instruction fields.
  - Audio player to play the generated results.
