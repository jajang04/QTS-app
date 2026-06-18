import type { Speaker } from '../types';

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
  return (
    <>
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
