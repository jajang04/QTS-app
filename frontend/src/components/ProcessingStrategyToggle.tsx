import React from 'react';
import { Zap, Save } from 'lucide-react';

interface Props {
  xVectorMode: boolean;
  setXVectorMode: (m: boolean) => void;
  cloneRefText: string;
  setCloneRefText: (t: string) => void;
  isTranscribing: boolean;
  cloneRefAudio: File | Blob | null;
  handleSaveVoice: () => void;
  isSaving: boolean;
}

export const ProcessingStrategyToggle = React.memo(({
  xVectorMode,
  setXVectorMode,
  cloneRefText,
  setCloneRefText,
  isTranscribing,
  cloneRefAudio,
  handleSaveVoice,
  isSaving
}: Props) => {
  return (
    <div className="form-group">
      <label htmlFor="cloneText">2. Processing Strategy</label>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '1rem' }}>
        <input 
          type="checkbox" 
          checked={xVectorMode} 
          onChange={(e) => {
            setXVectorMode(e.target.checked);
            if (e.target.checked) setCloneRefText('');
          }}
          style={{ accentColor: 'var(--aurora-1)', width: '18px', height: '18px' }}
        />
        <span style={{ fontSize: '0.95rem' }}>
          <Zap size={16} style={{ display: 'inline', color: '#fbbf24', marginRight: '4px' }} /> 
          Instant Clone (No Transcript Needed)
        </span>
      </label>

      {!xVectorMode && (
        <>
          <label htmlFor="cloneText" style={{ fontSize: '0.9rem' }}>Reference Transcript (Required)</label>
          <input
            type="text"
            id="cloneText"
            className="form-control"
            placeholder={isTranscribing ? "Transcribing audio... Please wait." : "What is exactly said in the audio?"}
            value={isTranscribing ? "" : cloneRefText}
            onChange={(e) => setCloneRefText(e.target.value)}
            disabled={isTranscribing}
            required={!xVectorMode}
          />
        </>
      )}
      
      {cloneRefAudio && (
        <button 
          type="button" 
          onClick={handleSaveVoice} 
          disabled={isSaving || isTranscribing || (!xVectorMode && !cloneRefText.trim())}
          className="btn btn-secondary" 
          style={{ marginTop: '1rem', width: '100%' }}
        >
          <Save size={18} /> {isSaving ? "Saving..." : "Save Character to Library"}
        </button>
      )}
    </div>
  );
});
