import React, { useEffect } from 'react';
import { Mic, Square, Upload } from 'lucide-react';
import { useMicrophone } from '../hooks/useMicrophone';
import { AudioVisualizer } from './AudioVisualizer';
import { useToast } from './ToastProvider';

interface Props {
  cloneRefAudio: File | Blob | null;
  setCloneRefAudio: (f: File | Blob | null) => void;
  xVectorMode: boolean;
  transcribeAudio: (blob: Blob | File) => void;
}

export const ReferenceAudioInput = React.memo(({ 
  cloneRefAudio, 
  setCloneRefAudio, 
  xVectorMode,
  transcribeAudio
}: Props) => {
  const { isRecording, audioBlob, stream, startRecording, stopRecording, setAudioBlob } = useMicrophone();
  const { addToast } = useToast();

  const handleRecord = async () => {
    if (isRecording) {
      stopRecording();
      addToast("Recording finished. Audio saved.", "info");
    } else {
      try {
        await startRecording();
      } catch (err: any) {
        addToast(err.message, "error");
      }
    }
  };

  useEffect(() => {
    if (audioBlob && cloneRefAudio !== audioBlob) {
      setCloneRefAudio(audioBlob);
      if (!xVectorMode) {
        transcribeAudio(audioBlob);
      }
    }
  }, [audioBlob, cloneRefAudio, setCloneRefAudio, xVectorMode, transcribeAudio]);

  return (
    <div className="form-group">
      <label>1. Provide Reference Audio (3s - 10s)</label>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
        <button 
          type="button"
          className={`btn ${isRecording ? '' : 'btn-secondary'} ${isRecording ? 'pulse-red' : ''}`}
          onClick={handleRecord}
          style={{ flex: 1, ...(isRecording ? { background: '#ef4444', color: 'white' } : {}) }}
        >
          {isRecording ? <Square size={18} /> : <Mic size={18} />}
          {isRecording ? "Stop" : "Record"}
        </button>
        
        <label className="btn btn-secondary" style={{ flex: 1, cursor: 'pointer', textAlign: 'center' }}>
          <Upload size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Upload
          <input
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const file = e.target.files[0];
                setCloneRefAudio(file);
                setAudioBlob(null);
                addToast("Audio file attached.", "info");
                if (!xVectorMode) transcribeAudio(file);
              }
            }}
          />
        </label>
      </div>
      
      {isRecording && <AudioVisualizer stream={stream} />}
      
      {cloneRefAudio && !isRecording && (
        <div style={{ padding: '0.5rem', background: 'rgba(20, 184, 166, 0.2)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--aurora-1)' }}>
          ✓ Audio ready for cloning
        </div>
      )}
    </div>
  );
});
