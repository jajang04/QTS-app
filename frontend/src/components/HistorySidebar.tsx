import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import type { HistoryItem } from '../types';

interface Props {
  history: HistoryItem[];
  removeFromHistory: (id: string) => void;
}

export const HistorySidebar = React.memo(function HistorySidebar({ history, removeFromHistory }: Props) {
  return (
    <div className="history-sidebar">
      <h2>Generation History</h2>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="empty-history">No generations yet. Create your first voice!</p>
        ) : (
          history.map(item => (
            <div key={item.id} className="history-card card">
              <div className="history-header" style={{ display: 'flex', alignItems: 'center' }}>
                <span className="badge">{item.speaker}</span>
                <span className="timestamp" style={{ marginLeft: 'auto', marginRight: '8px' }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                <button 
                  onClick={() => removeFromHistory(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  title="Delete generation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="history-text">
                {item.text.length > 65 ? item.text.substring(0, 65) + '...' : item.text}
              </p>
              <audio controls src={item.audioUrl} className="history-audio" />
              <a 
                href={item.audioUrl} 
                download={`qwen_tts_${item.timestamp}.${item.format}`}
                className="btn btn-secondary"
                style={{ marginTop: '0.8rem', padding: '0.6rem', fontSize: '0.9rem' }}
              >
                <Download size={16} />
                Download {item.format.toUpperCase()}
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
