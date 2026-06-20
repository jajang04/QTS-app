import type { Speaker } from '../types';

const API_BASE = 'http://localhost:8000/api';

export const apiClient = {
  fetchSpeakers: async (): Promise<{ speakers: Speaker[] }> => {
    const res = await fetch(`${API_BASE}/speakers`);
    if (!res.ok) throw new Error('Failed to fetch speakers');
    return res.json();
  },

  switchModel: async (modelType: 'Base' | 'CustomVoice', quantize: boolean = false): Promise<void> => {
    const res = await fetch(`${API_BASE}/switch_model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_type: modelType, quantize })
    });
    if (!res.ok) throw new Error('Failed to switch AI model in backend.');
  },

  generateVoiceStream: async (
    endpoint: string, 
    formData: FormData, 
    onChunk: (b64Audio: string, isLast: boolean, ram?: string, cpu?: string) => void
  ): Promise<void> => {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Generation failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    if (reader) {
      let done = false;
      let buffer = '';
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));
              onChunk(data.audio, data.is_last, data.ram, data.cpu);
            }
          }
          buffer = lines[lines.length - 1];
        }
      }
    }
  },

  generateBatch: async (formData: FormData): Promise<{batch_id: string}> => {
    const res = await fetch(`${API_BASE}/batch_generate`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Batch generation failed');
    return res.json();
  },

  transcribeAudio: async (formData: FormData): Promise<{ text: string }> => {
    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Transcription failed: ${res.statusText}`);
    return res.json();
  },

  fetchSavedVoices: async (): Promise<{ saved_voices: string[] }> => {
    const res = await fetch(`${API_BASE}/saved_voices`);
    if (!res.ok) throw new Error('Failed to fetch saved voices');
    return res.json();
  },

  saveCustomVoice: async (formData: FormData): Promise<{ saved_voice_id: string }> => {
    const res = await fetch(`${API_BASE}/save_custom_voice`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
    return res.json();
  },

  fetchChangelog: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/changelog`);
    if (!res.ok) throw new Error('Failed to fetch changelog');
    return res.json();
  }
};
