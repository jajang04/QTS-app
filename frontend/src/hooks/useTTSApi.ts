import { useState, useRef } from 'react';
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

export function concatenateWavs(buffers: Uint8Array[]) {
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

export class AudioQueue {
  private queue: Blob[] = [];
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  public onPlayingChange?: (playing: boolean) => void;

  private setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (this.onPlayingChange) this.onPlayingChange(playing);
  }

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioContext.destination);
    }
  }

  push(blob: Blob) {
    this.queue.push(blob);
    this.playNext();
  }

  private async playNext() {
    if (this.isPlaying || this.queue.length === 0) return;
    this.setPlaying(true);
    this.initAudio();

    const blob = this.queue.shift()!;
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      this.currentSource = this.audioContext!.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.analyser!);
      
      this.currentSource.onended = () => {
        this.setPlaying(false);
        this.currentSource = null;
        this.playNext();
      };
      
      this.currentSource.start();
    } catch (e) {
      console.error("Audio playback error", e);
      this.setPlaying(false);
      this.currentSource = null;
      this.playNext();
    }
  }

  stop() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch(e) {}
      this.currentSource = null;
    }
    this.queue = [];
    this.setPlaying(false);
  }
}

export function useTTSApi(addToHistory: (item: HistoryItem) => void) {
  const [loading, setLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [streamingChunks, setStreamingChunks] = useState<Uint8Array[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { addToast } = useToast();
  
  const [audioQueue] = useState(() => {
    const q = new AudioQueue();
    q.onPlayingChange = setIsPlaying;
    return q;
  });
  
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const stopPlayback = () => {
    audioQueue.stop();
  };

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
    setBatchProgress(0);
    setBatchTotal(0);
    setAudioUrl(null);
    setStreamingChunks([]);
    audioQueue.stop(); // Stop any previous playback

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

    const textList = options.batchMode 
      ? options.text.split('\n').map(t => t.trim()).filter(t => t)
      : [options.text];
      
    if (textList.length === 0) {
      setLoading(false);
      return;
    }

    if (options.batchMode) {
      setBatchTotal(textList.length);
    }
    
    const batchId = options.batchMode 
      ? `batch_${Math.random().toString(36).substring(2, 8).toUpperCase()}` 
      : undefined;
      
    const endpoint = options.activeTab === 'custom' ? 'generate_custom_voice' : 'generate_voice_clone';
    
    try {
      for (let i = 0; i < textList.length; i++) {
        if (options.batchMode) setBatchProgress(i + 1);
        
        formData.set('text', textList[i]);
        const chunks: Uint8Array[] = [];
        const startTime = Date.now();
        
        await apiClient.generateVoiceStream(endpoint, formData, async (b64Audio, isLast, ram, cpu) => {
          const buffer = base64ToArrayBuffer(b64Audio);
          chunks.push(buffer);
          setStreamingChunks([...chunks]); 
          
          const blob = new Blob([buffer], { type: 'audio/wav' });
          audioQueue.push(blob);
          if (!analyser && audioQueue.analyser) {
            setAnalyser(audioQueue.analyser);
          }
          
          if (isLast) {
            const finalBlob = concatenateWavs(chunks);
            const generationTime = Math.round((Date.now() - startTime) / 1000);
            const id = Date.now().toString() + i.toString();
            
            let fxType = '';
            if (options.preset) fxType = 'Studio Preset';
            else if (options.reverb > 0 || options.denoise > 0 || options.eq > 0) fxType = 'Custom FX';

            await saveAudioBlob(id, finalBlob);
            const url = URL.createObjectURL(finalBlob);
            
            if (!options.batchMode) setAudioUrl(url);
            
            addToHistory({
              id,
              text: textList[i],
              speaker: options.activeTab === 'custom' ? options.speaker : 'Clone',
              format: options.format,
              audioUrl: url,
              timestamp: Date.now(),
              mode: options.activeTab === 'custom' ? 'Custom Voice' : 'Voice Clone',
              generationTime,
              fxType,
              ramUsage: ram,
              cpuUsage: cpu,
              wordCount: textList[i].trim().split(/\s+/).length,
              batchId
            });
            
            if (!options.batchMode) addToast("Voice generated successfully!", "success");
          }
        });
      }
      if (options.batchMode) addToast("Batch generation completed!", "success");
    } catch (err: any) {
      addToast(err.message || 'Generation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return { loading, batchProgress, batchTotal, audioUrl, streamingChunks, generateVoice, stopPlayback, analyser, isPlaying };
}
