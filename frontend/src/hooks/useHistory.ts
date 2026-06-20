import { useState, useEffect } from 'react';
import type { HistoryItem } from '../types';
import { getAudioBlob, deleteAudioBlob } from '../services/db';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('qts_history');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadBlobs = async () => {
      const updated = await Promise.all(history.map(async (item) => {
        if (!item.audioUrl || item.audioUrl.startsWith('blob:')) {
           const blob = await getAudioBlob(item.id);
           if (blob) {
             return { ...item, audioUrl: URL.createObjectURL(blob) };
           }
        }
        return item;
      }));
      setHistory(updated);
      setIsLoaded(true);
    };
    if (!isLoaded && history.length > 0) {
      loadBlobs();
    } else if (history.length === 0) {
      setIsLoaded(true);
    }
  }, [history, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      // Save metadata to localStorage, omit transient blob URLs
      const toSave = history.map(h => ({...h, audioUrl: ''}));
      localStorage.setItem('qts_history', JSON.stringify(toSave));
    }
  }, [history, isLoaded]);

  const addToHistory = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const removeFromHistory = async (id: string) => {
    await deleteAudioBlob(id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return { history, addToHistory, removeFromHistory };
}
