import React, { useState, useEffect } from 'react';
import { Volume2, Loader2, Download } from 'lucide-react';
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
  const { loading, audioUrl, generateVoice } = useTTSApi(addToHistory);

  const [text, setText] = useState('');
  const [format, setFormat] = useState('wav');
  
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
  
  const [modelSwitching, setModelSwitching] = useState(false);
  const [switchProgress, setSwitchProgress] = useState(0);

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

  const handleTabSwitch = async (tab: 'custom' | 'clone') => {
    if (tab === activeTab) return;
    setModelSwitching(true);
    try {
      await apiClient.switchModel(tab === 'custom' ? 'CustomVoice' : 'Base');
      setActiveTab(tab);
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
      savedVoiceId
    });
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
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
        <div className="form-group">
          <label htmlFor="text">Text to Speak</label>
          <textarea
            id="text"
            className="form-control"
            placeholder="Enter the text you want to convert to speech..."
            value={text}
            onChange={(e) => setText(e.target.value)}
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
              Generating Audio...
            </>
          ) : (
            <>
              <Volume2 size={20} />
              Generate Voice
            </>
          )}
        </button>
      </form>

      {audioUrl && !loading && (
        <div className="audio-player-container">
          <h3>Result</h3>
          <audio controls src={audioUrl} autoPlay />
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
