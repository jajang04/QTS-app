import React, { useState } from 'react';
import { useToast } from './ToastProvider';
import { apiClient } from '../services/apiClient';

import { VoiceLibrarySelector } from './VoiceLibrarySelector';
import { ReferenceAudioInput } from './ReferenceAudioInput';
import { ProcessingStrategyToggle } from './ProcessingStrategyToggle';

interface Props {
  cloneRefAudio: File | Blob | null;
  setCloneRefAudio: (f: File | Blob | null) => void;
  cloneRefText: string;
  setCloneRefText: (t: string) => void;
  xVectorMode: boolean;
  setXVectorMode: (m: boolean) => void;
  savedVoiceId: string;
  setSavedVoiceId: (id: string) => void;
}

export const VoiceCloneForm = React.memo(({
  cloneRefAudio,
  setCloneRefAudio,
  cloneRefText,
  setCloneRefText,
  xVectorMode,
  setXVectorMode,
  savedVoiceId,
  setSavedVoiceId
}: Props) => {
  const { addToast } = useToast();
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [forceReloadLibrary, setForceReloadLibrary] = useState(0);

  const transcribeAudio = async (blob: Blob | File) => {
    setIsTranscribing(true);
    setCloneRefText(""); // clear while transcribing
    try {
      const fd = new FormData();
      fd.append('audio', blob);
      const res = await apiClient.transcribeAudio(fd);
      if (res.text) {
         setCloneRefText(res.text);
         addToast("Audio transcribed automatically!", "success");
      }
    } catch (err: any) {
      console.error(err);
      addToast("Failed to transcribe audio. Please type it manually.", "error");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveVoice = async () => {
    if (!cloneRefAudio) {
      addToast("Please provide reference audio first.", "error");
      return;
    }
    const name = prompt("Enter a name for your custom voice character:");
    if (!name) return;

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('ref_audio', cloneRefAudio);
      if (!xVectorMode) {
        fd.append('ref_text', cloneRefText);
      }
      fd.append('x_vector_only_mode', String(xVectorMode));

      await apiClient.saveCustomVoice(fd);
      addToast("Voice permanently saved to your library!", "success");
      setForceReloadLibrary(prev => prev + 1);
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <VoiceLibrarySelector 
        key={forceReloadLibrary}
        savedVoiceId={savedVoiceId} 
        setSavedVoiceId={setSavedVoiceId} 
      />

      {!savedVoiceId && (
        <div className="grid-2-cols" style={{ gap: '2rem' }}>
          <ReferenceAudioInput
            cloneRefAudio={cloneRefAudio}
            setCloneRefAudio={setCloneRefAudio}
            xVectorMode={xVectorMode}
            transcribeAudio={transcribeAudio}
          />

          <ProcessingStrategyToggle
            xVectorMode={xVectorMode}
            setXVectorMode={setXVectorMode}
            cloneRefText={cloneRefText}
            setCloneRefText={setCloneRefText}
            isTranscribing={isTranscribing}
            cloneRefAudio={cloneRefAudio}
            handleSaveVoice={handleSaveVoice}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
});
