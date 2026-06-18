import { useState, useEffect } from 'react';
import type { Speaker } from '../types';
import { apiClient } from '../services/apiClient';

const FALLBACK_SPEAKERS: Speaker[] = [
  {id: "Vivian", description: "Bright, slightly edgy young female voice. (Chinese)"},
  {id: "Serena", description: "Warm, gentle young female voice. (Chinese)"},
  {id: "Uncle_Fu", description: "Seasoned male voice with a low, mellow timbre. (Chinese)"},
  {id: "Dylan", description: "Youthful Beijing male voice. (Chinese)"},
  {id: "Eric", description: "Lively Chengdu male voice. (Chinese)"},
  {id: "Ryan", description: "Dynamic male voice with strong rhythmic drive. (English)"},
  {id: "Aiden", description: "Sunny American male voice with a clear midrange. (English)"},
  {id: "Ono_Anna", description: "Playful Japanese female voice. (Japanese)"},
  {id: "Sohee", description: "Warm Korean female voice with rich emotion. (Korean)"}
];

export function useSpeakers() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  useEffect(() => {
    apiClient.fetchSpeakers()
      .then(data => setSpeakers(data.speakers))
      .catch(err => {
        console.error("Failed to fetch speakers:", err);
        setSpeakers(FALLBACK_SPEAKERS);
      });
  }, []);

  return speakers;
}
