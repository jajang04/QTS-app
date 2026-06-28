import React, { useState } from 'react';
import { Download, Trash2, Folder, ChevronDown, ChevronRight, Layers, FileArchive } from 'lucide-react';
import JSZip from 'jszip';
import type { HistoryItem } from '../types';
import { concatenateWavs } from '../hooks/useTTSApi';

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

  const [mergingBatch, setMergingBatch] = useState<string | null>(null);
  const [zippingBatch, setZippingBatch] = useState<string | null>(null);

  const getFileName = (item: HistoryItem, prefix: string = '') => {
    let safeText = item.text.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    // Trim trailing underscores
    safeText = safeText.replace(/_+$/, '');
    const suffix = item.speaker.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${prefix}${safeText || 'audio'}_${suffix}.${item.format}`;
  };

  const downloadBatchAsZip = async (batchId: string, items: HistoryItem[]) => {
    setZippingBatch(batchId);
    try {
      const zip = new JSZip();
      
      const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);
      
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        if (!item.audioUrl) continue;
        const res = await fetch(item.audioUrl);
        const arrayBuffer = await res.arrayBuffer();
        
        const num = (i + 1).toString().padStart(3, '0');
        const filename = getFileName(item, `${num}_`);
        
        zip.file(filename, arrayBuffer);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `qwen_tts_batch_${batchId.substring(6)}.zip`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("Failed to zip batch", err);
      alert("Failed to zip batch files.");
    } finally {
      setZippingBatch(null);
    }
  };

  const mergeBatch = async (batchId: string, items: HistoryItem[]) => {
    setMergingBatch(batchId);
    try {
      const buffers: Uint8Array[] = [];
      // Fetch all blobs in chronological order (oldest first if array is reverse chronological, wait, the items might be reverse chronological, so reverse it)
      const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const item of sortedItems) {
        if (!item.audioUrl) continue;
        const res = await fetch(item.audioUrl);
        const arrayBuffer = await res.arrayBuffer();
        buffers.push(new Uint8Array(arrayBuffer));
      }
      
      const mergedBlob = concatenateWavs(buffers);
      const url = URL.createObjectURL(mergedBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `qwen_tts_batch_${batchId.substring(6)}.wav`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("Failed to merge batch", err);
      alert("Failed to merge batch files.");
    } finally {
      setMergingBatch(null);
    }
  };

  const formatBatchId = (batchId: string) => {
    const stripped = batchId.substring(6);
    if (/^\d{13}$/.test(stripped)) {
      return new Date(parseInt(stripped)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return stripped;
  };

  const renderItem = (item: HistoryItem) => (
    <div key={item.id} className="history-card card">
      <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div className="badges-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, marginRight: '12px' }}>
          <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid var(--aurora-1)', color: 'var(--aurora-1)', fontSize: '0.7rem', padding: '2px 8px' }}>{item.speaker.toUpperCase()}</span>
          {item.mode && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid var(--aurora-2)', color: 'var(--aurora-2)', fontSize: '0.7rem', padding: '2px 8px' }}>{item.mode.toUpperCase()}</span>}
          {item.fxType && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50', fontSize: '0.7rem', padding: '2px 8px' }}>🎧 {item.fxType.toUpperCase()}</span>}
          {item.generationTime !== undefined && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2px 8px' }}>⏱️ {item.generationTime}S</span>}
          {item.wordCount !== undefined && <span className="badge" style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '2px 8px' }}>📝 {item.wordCount}W</span>}
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
        download={getFileName(item)}
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
              <div key={batchId} className="batch-group card" style={{ padding: '0.8rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)', borderLeft: '3px solid var(--border-focus)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div 
                    className="batch-header" 
                    onClick={() => toggleBatch(batchId)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600, color: 'var(--aurora-2)', flex: 1, minWidth: 0, paddingRight: '12px' }}
                  >
                    {expandedBatches[batchId] ? <ChevronDown size={18} style={{ flexShrink: 0 }} /> : <ChevronRight size={18} style={{ flexShrink: 0 }} />}
                    <Folder size={16} style={{ margin: '0 8px', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      Batch {formatBatchId(batchId)} ({items.length} items)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: '8px' }}
                      onClick={(e) => { e.stopPropagation(); downloadBatchAsZip(batchId, items); }}
                      disabled={zippingBatch === batchId}
                      title="Download batch as ZIP"
                    >
                      {zippingBatch === batchId ? <span className="spinner" style={{width:'14px', height:'14px', borderWidth:'2px'}} /> : <FileArchive size={16} />}
                    </button>
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ width: '32px', height: '32px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: '8px' }}
                      onClick={(e) => { e.stopPropagation(); mergeBatch(batchId, items); }}
                      disabled={mergingBatch === batchId}
                      title="Merge into single WAV"
                    >
                      {mergingBatch === batchId ? <span className="spinner" style={{width:'14px', height:'14px', borderWidth:'2px'}} /> : <Layers size={16} />}
                    </button>
                  </div>
                </div>
                {expandedBatches[batchId] && (
                  <div className="batch-items" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '1.2rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0.6rem', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.06)' }} />
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
