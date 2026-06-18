import { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
}

export function AudioVisualizer({ stream }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    if (!canvasCtx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        const r = Math.min(255, barHeight + (25 * (i / bufferLength)));
        const g = Math.min(255, 180 + (70 * (i / bufferLength)));
        const b = 255; // Aurora blue tint

        canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioContext.close();
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <div style={{ marginTop: '1rem', width: '100%', height: '60px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={400} height={60} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
