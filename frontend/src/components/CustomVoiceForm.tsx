import React, { useState, useEffect } from 'react';
import type { Speaker } from '../types';

interface SavedProfile {
  id: string;
  name: string;
  speaker: string;
  language: string;
  instruct: string;
}

interface Props {
  speakers: Speaker[];
  speaker: string;
  setSpeaker: (s: string) => void;
  language: string;
  setLanguage: (l: string) => void;
  instruct: string;
  setInstruct: (i: string) => void;
}

export function CustomVoiceForm({
  speakers,
  speaker,
  setSpeaker,
  language,
  setLanguage,
  instruct,
  setInstruct
}: Props) {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('qts_custom_profiles');
    if (saved) {
      try { setProfiles(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveProfile = () => {
    const name = prompt("Enter a name for this profile:");
    if (!name) return;
    const newProfile: SavedProfile = {
      id: Date.now().toString(),
      name,
      speaker,
      language,
      instruct
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    setSelectedProfileId(newProfile.id);
    localStorage.setItem('qts_custom_profiles', JSON.stringify(updated));
  };

  const deleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    if (selectedProfileId === id) setSelectedProfileId('');
    localStorage.setItem('qts_custom_profiles', JSON.stringify(updated));
  };

  const loadProfile = (id: string) => {
    setSelectedProfileId(id);
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setSpeaker(profile.speaker);
      setLanguage(profile.language);
      setInstruct(profile.instruct);
    }
  };

  return (
    <>
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <label style={{ margin: 0, fontWeight: 600 }}>Saved Profiles</label>
          <button type="button" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={saveProfile}>
            💾 Save Current Settings
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            className="form-control" 
            value={selectedProfileId} 
            onChange={(e) => loadProfile(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">-- Select a saved profile --</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProfileId && (
            <button type="button" className="btn" style={{ padding: '8px', background: '#E91E63' }} onClick={() => deleteProfile(selectedProfileId)}>
              🗑️
            </button>
          )}
        </div>
      </div>
      <div className="grid-2-cols">
        <div className="form-group">
          <label htmlFor="speaker">Voice Actor</label>
          <select
            id="speaker"
            className="form-control"
            value={speaker}
            onChange={(e) => {
              const newSpeakerId = e.target.value;
              setSpeaker(newSpeakerId);
              
              const speakerObj = speakers.find(s => s.id === newSpeakerId);
              if (speakerObj) {
                if (speakerObj.description.includes('(Chinese)')) setLanguage('Chinese');
                else if (speakerObj.description.includes('(English)')) setLanguage('English');
                else if (speakerObj.description.includes('(Japanese)')) setLanguage('Japanese');
                else if (speakerObj.description.includes('(Korean)')) setLanguage('Korean');
                else setLanguage('Auto');
              }
            }}
          >
            {speakers.map(s => (
              <option key={s.id} value={s.id}>{s.id} - {s.description.split('.')[0]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="language">Language</label>
          <select
            id="language"
            className="form-control"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="Auto">Auto-Detect</option>
            <option value="English">English</option>
            <option value="Chinese">Chinese</option>
            <option value="Japanese">Japanese</option>
            <option value="Korean">Korean</option>
            <option value="German">German</option>
            <option value="French">French</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="instruct">Style Instruction (Optional)</label>
        <input
          type="text"
          id="instruct"
          className="form-control"
          placeholder="e.g. Speak with an excited tone..."
          value={instruct}
          onChange={(e) => setInstruct(e.target.value)}
        />
      </div>
    </>
  );
}
