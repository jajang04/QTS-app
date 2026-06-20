import { useState } from 'react';
import type { HistoryItem } from '../types';
import { useToast } from '../components/ToastProvider';
import { apiClient } from '../services/apiClient';
import { saveAudioBlob } from '../services/db';

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
  preset: boolean;
  reverb: number;
  denoise: number;
  eq: number;
  batchMode?: boolean;
  quantize: boolean;
}

function base64ToArrayBuffer(base64: string) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

function concatenateWavs(buffers: Uint8Array[]) {
  if (buffers.length === 0) return new Blob();
  if (buffers.length === 1) return new Blob([buffers[0]], { type: 'audio/wav' });

  // Simple WAV concatenator (assumes identical 44-byte headers)
  const header = buffers[0].slice(0, 44);
  let totalDataLength = 0;
  const dataChunks: Uint8Array[] = [];
  
  for (const buf of buffers) {
    const data = buf.slice(44);
    dataChunks.push(data);
    totalDataLength += data.length;
  }
  
  const finalWav = new Uint8Array(44 + totalDataLength);
  finalWav.set(header, 0);
  
  // Update ChunkSize (byte 4) and Subchunk2Size (byte 40)
  const dataView = new DataView(finalWav.buffer);
  dataView.setUint32(4, 36 + totalDataLength, true);
  dataView.setUint32(40, totalDataLength, true);
  
  let offset = 44;
  for (const data of dataChunks) {
    finalWav.set(data, offset);
    offset += data.length;
  }
  
  return new Blob([finalWav], { type: 'audio/wav' });
}

export function useTTSApi(addToHistory: (item: HistoryItem) => void) {
  const [loading, setLoading] = useState(false);
  const [streamingChunks, setStreamingChunks] = useState<Uint8Array[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { addToast } = useToast();

  const generateVoice = async (options: GenerationOptions) => {
    if (!options.text.trim()) return;
    
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
    setStreamingChunks([]);

    const formData = new FormData();
    formData.append('audio_format', options.format);
    formData.append('preset', String(options.preset));
    formData.append('reverb', String(options.reverb));
    formData.append('denoise', String(options.denoise));
    formData.append('eq', String(options.eq));

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

    if (options.batchMode) {
      // Split text by newlines and create JSON array
      const textList = options.text.split('\n').map(t => t.trim()).filter(t => t);
      formData.append('texts', JSON.stringify(textList));
      formData.append('clone_mode', String(options.activeTab === 'clone'));
      
      try {
        const res = await apiClient.generateBatch(formData);
        addToast(`Batch ${res.batch_id} queued! Generating ${res.items} items...`, "success");
      } catch(err: any) {
        addToast(err.message || 'Batch generation failed.', "error");
      } finally {
        setLoading(false);
      }
      return;
    }

    formData.append('text', options.text);
    
    try {
      const endpoint = options.activeTab === 'custom' ? 'generate_custom_voice' : 'generate_voice_clone';
      const chunks: Uint8Array[] = [];
      const startTime = Date.now();
      
      await apiClient.generateVoiceStream(endpoint, formData, async (b64Audio, isLast, ram, cpu) => {
        const buffer = base64ToArrayBuffer(b64Audio);
        chunks.push(buffer);
        setStreamingChunks([...chunks]); // Trigger re-render to play chunk immediately if needed
        
        if (isLast) {
          const finalBlob = concatenateWavs(chunks);
          const generationTime = Math.round((Date.now() - startTime) / 1000);
          const id = Date.now().toString();
          
          let fxType = '';
          if (options.preset) fxType = 'Studio Preset';
          else if (options.reverb > 0 || options.denoise > 0 || options.eq > 0) fxType = 'Custom FX';

          await saveAudioBlob(id, finalBlob);
          const url = URL.createObjectURL(finalBlob);
          setAudioUrl(url);
          addToHistory({
            id,
            text: options.text,
            speaker: options.activeTab === 'custom' ? options.speaker : 'Clone',
            format: options.format,
            audioUrl: url,
            timestamp: Date.now(),
            quantize: options.quantize,
            mode: options.activeTab === 'custom' ? 'Custom Voice' : 'Voice Clone',
            generationTime,
            fxType,
            ramUsage: ram,
            cpuUsage: cpu
          });
          addToast("Voice generated successfully!", "success");
        }
      });
      
    } catch (err: any) {
      addToast(err.message || 'An error occurred during generation.', "error");
    } finally {
      setLoading(false);
    }
  };

  return { loading, audioUrl, streamingChunks, generateVoice };
}
