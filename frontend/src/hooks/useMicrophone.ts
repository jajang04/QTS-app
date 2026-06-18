import { useState, useRef, useCallback } from 'react';
import { convertBlobToWav } from '../utils/audioUtils';

export function useMicrophone() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const wavBlob = await convertBlobToWav(webmBlob);
          setAudioBlob(wavBlob);
        } catch (e) {
          console.error("Audio conversion failed:", e);
          setAudioBlob(webmBlob); // Fallback
        }
        
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAudioBlob(null);
    } catch (err) {
      console.error("Microphone error", err);
      throw new Error("Could not access microphone. Ensure you have granted permission.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    audioBlob,
    stream,
    startRecording,
    stopRecording,
    setAudioBlob
  };
}
