import React, { useEffect, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal = ({ isOpen, onClose }: Props) => {
  const [changelogData, setChangelogData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !changelogData) {
      setLoading(true);
      apiClient.fetchChangelog()
        .then(data => {
          setChangelogData(data);
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, changelogData]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{
        maxWidth: '600px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={24} color="var(--accent-mint)" /> Changelog
        </h2>

        <div style={{ overflowY: 'auto', paddingRight: '1rem', flex: 1 }} className="history-list">
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading changelog...</p>
          ) : !changelogData || !changelogData.releases || changelogData.releases.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No changelog data found.</p>
          ) : (
            changelogData.releases.map((release: any, idx: number) => (
              <div key={idx} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>{release.version}</h3>
                  <span className="badge" style={{ color: 'var(--accent-violet)', borderColor: 'rgba(167, 139, 250, 0.3)' }}>{release.date}</span>
                </div>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {release.changes.map((change: any, cidx: number) => (
                    <li key={cidx} style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        background: change.type === 'feature' ? 'rgba(45, 212, 191, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                        color: change.type === 'feature' ? 'var(--accent-mint)' : 'var(--accent-violet)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        marginTop: '0.2rem'
                      }}>
                        {change.type}
                      </span>
                      <span style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                        {change.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
