import React, { useState } from 'react';
import { Download, Trash2, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import type { HistoryItem } from '../types';

interface Props {
  history: HistoryItem[];
  removeFromHistory: (id: string) => void;
}

export const HistorySidebar = React.memo(function HistorySidebar({ history, removeFromHistory }: Props) {
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  const standaloneItems: HistoryItem[] = [];
  const batchedItems: Record<string, HistoryItem[]> = {};

  history.forEach(item => {
    if (item.batchId) {
      if (!batchedItems[item.batchId]) batchedItems[item.batchId] = [];
      batchedItems[item.batchId].push(item);
    } else {
      standaloneItems.push(item);
    }
  });

  const renderItem = (item: HistoryItem) => (
    <div key={item.id} className="history-card card">
      <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div className="badges-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, marginRight: '12px' }}>
          <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid var(--aurora-1)', color: 'var(--aurora-1)', fontSize: '0.7rem', padding: '2px 8px' }}>{item.speaker.toUpperCase()}</span>
          {item.mode && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid var(--aurora-2)', color: 'var(--aurora-2)', fontSize: '0.7rem', padding: '2px 8px' }}>{item.mode.toUpperCase()}</span>}
          {item.quantize && <span className="badge" style={{ backgroundColor: '#ff9800', color: '#000', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 700 }}>⚡ LOW RAM</span>}
          {item.fxType && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontSize: '0.7rem', padding: '2px 8px' }}>🎧 {item.fxType.toUpperCase()}</span>}
          {item.generationTime !== undefined && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2px 8px' }}>⏱️ {item.generationTime}S</span>}
          {item.ramUsage && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid #2196F3', color: '#2196F3', fontSize: '0.7rem', padding: '2px 8px' }}>💾 {item.ramUsage}</span>}
          {item.cpuUsage && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid #E91E63', color: '#E91E63', fontSize: '0.7rem', padding: '2px 8px' }}>⚙️ {item.cpuUsage}</span>}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
          <span className="timestamp" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button 
            onClick={() => removeFromHistory(item.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
            title="Delete generation"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="history-text">
        {item.text.length > 65 ? item.text.substring(0, 65) + '...' : item.text}
      </p>
      <audio controls src={item.audioUrl || undefined} className="history-audio" />
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
  );

  return (
    <div className="history-sidebar">
      <h2>Generation History</h2>
      <div className="history-list">
        {history.length === 0 ? (
          <p className="empty-history">No generations yet. Create your first voice!</p>
        ) : (
          <>
            {Object.entries(batchedItems).map(([batchId, items]) => (
              <div key={batchId} className="batch-group card" style={{ padding: '0.8rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div 
                  className="batch-header" 
                  onClick={() => toggleBatch(batchId)}
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600, color: 'var(--aurora-2)' }}
                >
                  {expandedBatches[batchId] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <Folder size={16} style={{ margin: '0 8px' }} />
                  Batch {batchId.substring(6)} ({items.length} items)
                </div>
                {expandedBatches[batchId] && (
                  <div className="batch-items" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map(renderItem)}
                  </div>
                )}
              </div>
            ))}
            {standaloneItems.map(renderItem)}
          </>
        )}
      </div>
    </div>
  );
});
