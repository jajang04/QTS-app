import React, { useState, useEffect } from 'react';
import { Volume2, Loader2, Download, Settings2, FileText } from 'lucide-react';
import { CustomVoiceForm } from './CustomVoiceForm';
import { VoiceCloneForm } from './VoiceCloneForm';
import { AudioVisualizer } from './AudioVisualizer';
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
  const { loading, batchProgress, batchTotal, audioUrl, streamingChunks, generateVoice, stopPlayback, analyser, isPlaying } = useTTSApi(addToHistory);

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

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  const getFormatMultiplier = () => {
    switch (format) {
      case 'flac': return 4.2;
      case 'ogg': return 3.8;
      case 'wav':
      default: return 2.7;
    }
  };
  
  const estimatedTotal = Math.round(wordCount * getFormatMultiplier());

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
      await apiClient.switchModel(tab === 'custom' ? 'CustomVoice' : 'Base');
      if (tab !== activeTab) setActiveTab(tab);
      addToast(`Switched to ${tab === 'custom' ? 'Custom Voice' : 'Voice Clone'} mode`, 'success');
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
      batchMode
    });
  };

  // Removed old tempStreamUrl hack; queue playback is now handled natively inside useTTSApi

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
          {(() => {
            const estStr = estimatedTotal < 60 ? `${estimatedTotal}s` : `${Math.floor(estimatedTotal/60)}m ${estimatedTotal%60}s`;
            return (
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>{wordCount} words {wordCount > 0 ? `• Est. time: ~${estStr}` : ''}</span>
              </div>
            );
          })()}
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
              style={{ padding: '4px 8px', fontSize: '0.8rem', marginTop: '4px', opacity: preset ? 0.5 : 1, cursor: preset ? 'not-allowed' : 'pointer' }}
              onClick={() => setShowAdvancedFx(!showAdvancedFx)}
              disabled={preset}
              title={preset ? "Advanced FX disabled when Studio Preset is active" : ""}
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
            batchMode ? (
              <>
                <Loader2 className="spinner" />
                Generating Batch: {batchProgress} / {batchTotal}
              </>
            ) : (
              <>
                <Loader2 className="spinner" />
                {streamingChunks.length > 0 
                  ? `Streaming... (${streamingChunks.length} chunks) | ${elapsedSeconds}s / ~${estimatedTotal}s` 
                  : `Generating... | ${elapsedSeconds}s / ~${estimatedTotal}s`}
              </>
            )
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

      {analyser && isPlaying && (
        <AudioVisualizer analyser={analyser} />
      )}

      {audioUrl && !loading && !batchMode && (
        <div className="audio-player-container">
          <h3>Result</h3>
          <audio controls src={audioUrl || undefined} autoPlay onPlay={stopPlayback} />
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
