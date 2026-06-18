import type { Speaker } from '../types';

const API_BASE = 'http://localhost:8000/api';

export const apiClient = {
  fetchSpeakers: async (): Promise<{ speakers: Speaker[] }> => {
    const res = await fetch(`${API_BASE}/speakers`);
    if (!res.ok) throw new Error('Failed to fetch speakers');
    return res.json();
  },

  switchModel: async (modelType: 'Base' | 'CustomVoice'): Promise<void> => {
    const res = await fetch(`${API_BASE}/switch_model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_type: modelType })
    });
    if (!res.ok) throw new Error('Failed to switch AI model in backend.');
  },

  generateCustomVoice: async (formData: FormData): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/generate_custom_voice`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Generation failed: ${res.statusText}`);
    return res.blob();
  },

  generateVoiceClone: async (formData: FormData): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/generate_voice_clone`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Generation failed: ${res.statusText}`);
    return res.blob();
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
