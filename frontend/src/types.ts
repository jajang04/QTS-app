export interface Speaker {
  id: string;
  description: string;
}

export interface HistoryItem {
  id: string;
  text: string;
  speaker: string;
  format: string;
  audioUrl: string;
  timestamp: number;
}
