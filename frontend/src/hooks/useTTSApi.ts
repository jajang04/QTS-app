import { useState } from 'react';
import type { HistoryItem } from '../types';
import { useToast } from '../components/ToastProvider';
import { apiClient } from '../services/apiClient';

interface GenerationOptions {
  text: string;
  format: string;
  activeTab: 'custom' | 'clone';
  speaker: string;
  language: string;
  instruct: string;
  cloneRefText: string;
  cloneRefAudio: File | Blob | null;
  xVectorMode: boolean;
  savedVoiceId: string;
}

export function useTTSApi(addToHistory: (item: HistoryItem) => void) {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { addToast } = useToast();

  const generateVoice = async (options: GenerationOptions) => {
    if (!options.text.trim()) return;
    
    // If we're cloning, we must have either a savedVoiceId, or (a mic/audio blob AND either a transcript or xVectorMode=true)
    if (options.activeTab === 'clone') {
      if (!options.savedVoiceId) {
        if (!options.cloneRefAudio) {
          addToast("Please provide reference audio or select a saved voice.", "error");
          return;
        }
        if (!options.xVectorMode && !options.cloneRefText.trim()) {
          addToast("Please provide reference transcript or enable Instant Clone mode.", "error");
          return;
        }
      }
    }

    setLoading(true);
    setAudioUrl(null);

    const formData = new FormData();
    formData.append('text', options.text);
    formData.append('audio_format', options.format);

    if (options.activeTab === 'custom') {
      formData.append('language', options.language);
      formData.append('speaker', options.speaker);
      formData.append('instruct', options.instruct);
    } else {
      formData.append('x_vector_only_mode', String(options.xVectorMode));
      if (options.savedVoiceId) {
        formData.append('saved_voice_id', options.savedVoiceId);
      } else {
        if (options.cloneRefAudio) {
          formData.append('ref_audio', options.cloneRefAudio as Blob);
        }
        if (!options.xVectorMode) {
          formData.append('ref_text', options.cloneRefText);
        }
      }
    }

    try {
      let blob: Blob;
      if (options.activeTab === 'custom') {
        blob = await apiClient.generateCustomVoice(formData);
      } else {
        blob = await apiClient.generateVoiceClone(formData);
      }

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        text: options.text,
        speaker: options.activeTab === 'custom' ? options.speaker : 'Clone',
        format: options.format,
        audioUrl: url,
        timestamp: Date.now()
      };
      addToHistory(newItem);
      addToast("Voice generated successfully!", "success");
    } catch (err: any) {
      addToast(err.message || 'An error occurred during generation.', "error");
    } finally {
      setLoading(false);
    }
  };

  return { loading, audioUrl, generateVoice };
}
