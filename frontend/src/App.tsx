import './index.css';

import { useSpeakers } from './hooks/useSpeakers';
import { useHistory } from './hooks/useHistory';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { HistorySidebar } from './components/HistorySidebar';
import { TTSGeneratorCard } from './components/TTSGeneratorCard';
import { ChangelogModal } from './components/ChangelogModal';

function App() {
  const speakers = useSpeakers();
  const { history, addToHistory, removeFromHistory } = useHistory();
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  return (
    <>
      <div className="aurora-blob"></div>
      <div className="app-layout">
        <div className="header-section" style={{ position: 'relative' }}>
          <h1 className="app-title">QTS-app</h1>
          <p className="app-subtitle">High-fidelity voice generation powered by Qwen3-TTS</p>
          <button 
            onClick={() => setIsChangelogOpen(true)}
            className="btn btn-secondary"
            style={{ position: 'absolute', top: 0, right: 0, padding: '0.6rem 1rem', width: 'auto', gap: '0.5rem', fontSize: '0.9rem' }}
          >
            <FileText size={16} /> Changelog
          </button>
        </div>

        <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />

        <div className="dashboard-layout">
          <div className="container">
            <TTSGeneratorCard speakers={speakers} addToHistory={addToHistory} />
          </div>
          
          <HistorySidebar history={history} removeFromHistory={removeFromHistory} />
        </div>
      </div>
    </>
  );
}

export default App;
