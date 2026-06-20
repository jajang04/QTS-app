export interface Speaker {
  id: string;
  description: string;
}

export interface HistoryItem {
  id: string;
  text: string;
  speaker: string;
  format: string;
  audioUrl?: string;
  timestamp: number;
  batchId?: string;
  generationTime?: number;
  mode?: 'Custom Voice' | 'Voice Clone';
  fxType?: string;
  ramUsage?: string;
  cpuUsage?: string;
  wordCount?: number;
}
