import { useState, useEffect } from 'react';
import type { HistoryItem } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('qts_history');
    if (saved) return JSON.parse(saved);
    return [];
  });

  useEffect(() => {
    localStorage.setItem('qts_history', JSON.stringify(history));
  }, [history]);

  const addToHistory = (item: HistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return { history, addToHistory, removeFromHistory };
}
