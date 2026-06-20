import React, { useState, useEffect } from 'react';
import { Volume2, Loader2, Download, Settings2, FileText } from 'lucide-react';
import { CustomVoiceForm } from './CustomVoiceForm';
import { VoiceCloneForm } from './VoiceCloneForm';
import { useToast } from './ToastProvider';
import { apiClient } from '../services/apiClient';
import { useTTSApi } from '../hooks/useTTSApi';
import type { Speaker, HistoryItem } from '../types';

interface Props {
  speakers: { speakers: Speaker[] };
  addToHistory: (item: HistoryItem) => void;
}

export const TTSGeneratorCard = React.memo(({ speakers, addToHistory }: Props) => {
  const { addToast } = useToast();
  const { loading, audioUrl, streamingChunks, generateVoice } = useTTSApi(addToHistory);

  const [text, setText] = useState('');
  const [format, setFormat] = useState('wav');
  const [batchMode, setBatchMode] = useState(false);
  
  // Custom Voice State
  const [speaker, setSpeaker] = useState('Vivian');
  const [language, setLanguage] = useState('Auto');
  const [instruct, setInstruct] = useState('');
  
  // Clone Voice State
  const [activeTab, setActiveTab] = useState<'custom' | 'clone'>('custom');
  const [cloneRefText, setCloneRefText] = useState('');
  const [cloneRefAudio, setCloneRefAudio] = useState<File | Blob | null>(null);
  const [xVectorMode, setXVectorMode] = useState(false);
  const [savedVoiceId, setSavedVoiceId] = useState('');
  
  // FX State
  const [preset, setPreset] = useState(false);
  const [showAdvancedFx, setShowAdvancedFx] = useState(false);
  const [reverb, setReverb] = useState(0);
  const [denoise, setDenoise] = useState(0);
  const [eq, setEq] = useState(0);

  // Quantization State
  const [quantize, setQuantize] = useState(false);

  const [modelSwitching, setModelSwitching] = useState(false);
  const [switchProgress, setSwitchProgress] = useState(0);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (loading) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading]);

  const estimatedTotal = Math.max(2, Math.ceil(text.length * 0.35));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (modelSwitching) {
      setSwitchProgress(0);
      interval = setInterval(() => {
        setSwitchProgress((prev) => {
          if (prev >= 95) return 95;
          return prev + (95 - prev) * 0.15;
        });
      }, 300);
    } else {
      setSwitchProgress(100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [modelSwitching]);

  const handleTabSwitch = async (tab: 'custom' | 'clone', forceReload: boolean = false) => {
    if (tab === activeTab && !forceReload) return;
    setModelSwitching(true);
    try {
      await apiClient.switchModel(tab === 'custom' ? 'CustomVoice' : 'Base', quantize);
      if (tab !== activeTab) setActiveTab(tab);
      addToast(`Switched to ${tab === 'custom' ? 'Custom Voice' : 'Voice Clone'} mode ${quantize ? '(Low RAM)' : ''}`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Could not switch model. Make sure backend is running.', 'error');
    } finally {
      setModelSwitching(false);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateVoice({
      text,
      format,
      activeTab,
      speaker,
      language,
      instruct,
      cloneRefText,
      cloneRefAudio,
      xVectorMode,
      savedVoiceId,
      preset,
      reverb,
      denoise,
      eq,
      batchMode,
      quantize
    });
  };

  // Create temporary URL for currently streamed chunks
  const [tempStreamUrl, setTempStreamUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (streamingChunks.length > 0 && !audioUrl) {
      // Fast hack to make streaming chunks playable: convert raw PCM or WAV segments.
      // We rely on useTTSApi generating proper concatenated wav when done.
      // For real-time playback, a MediaSource API is best, but to stay simple we show loading text 
      // or we can play chunks using AudioContext. Since requirements specify SSE, let's just 
      // indicate streaming progress visually.
    }
  }, [streamingChunks, audioUrl]);

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          type="button"
          className={activeTab === 'custom' ? "btn" : "btn btn-secondary"}
          onClick={() => handleTabSwitch('custom')}
          disabled={modelSwitching}
          style={{ flex: 1 }}
        >
          Custom Voice
        </button>
        <button 
          type="button"
          className={activeTab === 'clone' ? "btn" : "btn btn-secondary"}
          onClick={() => handleTabSwitch('clone')}
          disabled={modelSwitching}
          style={{ flex: 1 }}
        >
          Voice Clone
        </button>
      </div>

      <div className="card" style={{ padding: '0.8rem 1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={quantize} onChange={e => setQuantize(e.target.checked)} disabled={modelSwitching} />
          ⚡ Low RAM Mode (INT8 Quantization - Less RAM, Slower CPU)
        </label>
        <button 
          type="button" 
          className="btn btn-secondary" 
          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
          onClick={() => handleTabSwitch(activeTab, true)}
          disabled={modelSwitching}
        >
          Apply & Reload Model
        </button>
      </div>

      {modelSwitching && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', color: 'var(--aurora-1)' }}>
            <Loader2 className="spinner" size={18} />
            <span style={{ fontWeight: 600 }}>Loading AI Model into Memory...</span>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px' }}>
            <div className="progress-bar-fill" style={{ width: `${switchProgress}%` }}></div>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate}>
        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="text" style={{ margin: 0 }}>Text to Speak</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input 
              type="checkbox" 
              checked={batchMode} 
              onChange={e => setBatchMode(e.target.checked)} 
            />
            Batch Mode (One line = One generation)
          </label>
        </div>
        <div className="form-group">
          <textarea
            id="text"
            className="form-control"
            placeholder={batchMode ? "Enter text, one sentence/script per line..." : "Enter the text you want to convert to speech..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={batchMode ? 8 : 4}
            required
          />
        </div>

        {activeTab === 'custom' ? (
          <CustomVoiceForm 
            speakers={speakers}
            speaker={speaker}
            setSpeaker={setSpeaker}
            language={language}
            setLanguage={setLanguage}
            instruct={instruct}
            setInstruct={setInstruct}
          />
        ) : (
          <VoiceCloneForm
            cloneRefAudio={cloneRefAudio}
            setCloneRefAudio={setCloneRefAudio}
            cloneRefText={cloneRefText}
            setCloneRefText={setCloneRefText}
            xVectorMode={xVectorMode}
            setXVectorMode={setXVectorMode}
            savedVoiceId={savedVoiceId}
            setSavedVoiceId={setSavedVoiceId}
          />
        )}

        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: showAdvancedFx ? '1rem' : 0 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={preset} onChange={e => setPreset(e.target.checked)} />
                🎙️ Studio Quality Preset (Auto Loudness/Smooth)
              </label>
              <p style={{ margin: '4px 0 0 24px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Applies a gentle Compressor & Limiter to maximize loudness. <br/>
                <span style={{ opacity: 0.7 }}>(Overrides manual sliders &rarr; Reverb Intensity: 0, Denoise Level: Auto, EQ: 0)</span>
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '0.8rem', marginTop: '4px' }}
              onClick={() => setShowAdvancedFx(!showAdvancedFx)}
            >
              <Settings2 size={14} style={{ marginRight: '4px' }} />
              Advanced FX
            </button>
          </div>
          
          {showAdvancedFx && !preset && (
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <label>Reverb Intensity: {reverb} <input type="range" min="0" max="1" step="0.1" value={reverb} onChange={e=>setReverb(Number(e.target.value))} style={{width:'100%'}} /></label>
              <label>Denoise Level: {denoise} <input type="range" min="0" max="1" step="0.1" value={denoise} onChange={e=>setDenoise(Number(e.target.value))} style={{width:'100%'}} /></label>
              <label>EQ (Vocal Boost): {eq} <input type="range" min="0" max="1" step="0.1" value={eq} onChange={e=>setEq(Number(e.target.value))} style={{width:'100%'}} /></label>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="format">Audio Download Format</label>
          <select
            id="format"
            className="form-control"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="wav">WAV (Highest Quality, Uncompressed)</option>
            <option value="flac">FLAC (Lossless Compression, Smaller)</option>
            <option value="ogg">OGG Vorbis (Good Quality, Smallest)</option>
          </select>
        </div>

        <button type="submit" className="btn" disabled={loading || modelSwitching || !text.trim()}>
          {loading ? (
            <>
              <Loader2 className="spinner" />
              {streamingChunks.length > 0 
                ? `Streaming... (${streamingChunks.length} chunks) | ${elapsedSeconds}s / ~${estimatedTotal}s` 
                : `Generating... | ${elapsedSeconds}s / ~${estimatedTotal}s`}
            </>
          ) : batchMode ? (
            <>
              <FileText size={20} />
              Queue Batch Generation
            </>
          ) : (
            <>
              <Volume2 size={20} />
              Generate Voice
            </>
          )}
        </button>
      </form>

      {audioUrl && !loading && !batchMode && (
        <div className="audio-player-container">
          <h3>Result</h3>
          <audio controls src={audioUrl || undefined} autoPlay />
          <a 
            href={audioUrl} 
            download={`qwen_tts_output.${format}`}
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            <Download size={20} />
            Download as {format.toUpperCase()}
          </a>
        </div>
      )}
    </div>
  );
});
