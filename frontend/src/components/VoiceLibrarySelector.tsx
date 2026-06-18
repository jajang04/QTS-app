import React, { useEffect, useState } from 'react';
import { Library } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface Props {
  savedVoiceId: string;
  setSavedVoiceId: (id: string) => void;
  onVoicesLoaded?: () => void;
}

export const VoiceLibrarySelector = React.memo(({ savedVoiceId, setSavedVoiceId, onVoicesLoaded }: Props) => {
  const [savedVoices, setSavedVoices] = useState<string[]>([]);

  const loadSavedVoices = async () => {
    try {
      const data = await apiClient.fetchSavedVoices();
      setSavedVoices(data.saved_voices);
      if (onVoicesLoaded) onVoicesLoaded();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSavedVoices();
  }, []);

  if (savedVoices.length === 0) return null;

  return (
    <div className="form-group" style={{ padding: '0.5rem 0' }}>
      <label htmlFor="savedVoice">
        <Library size={18} style={{ display: 'inline', marginRight: '6px' }} /> Voice Library
      </label>
      <select 
        id="savedVoice" 
        className="form-control"
        value={savedVoiceId}
        onChange={(e) => setSavedVoiceId(e.target.value)}
      >
        <option value="">-- Create New Voice Clone --</option>
        {savedVoices.map(voice => (
          <option key={voice} value={voice}>{voice}</option>
        ))}
      </select>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
        Select a saved voice to generate speech instantly.
      </p>
    </div>
  );
});
