// Ambient underwater sound + French voice-over (Web Speech API).
import { useEffect, useRef, useState } from 'react';
import { UnderwaterAudioEngine } from '../lib/underwaterAudio';

export function useAudio() {
  const engineRef = useRef<UnderwaterAudioEngine | null>(null);
  const [ambientOn, setAmbientOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    engineRef.current = new UnderwaterAudioEngine();
    return () => {
      engineRef.current?.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const startAmbient = () => {
    if (!engineRef.current) return;
    engineRef.current.start();
    setAmbientOn(true);
  };

  const toggleAmbient = () => {
    if (!engineRef.current) return;
    if (ambientOn) {
      engineRef.current.stop();
      setAmbientOn(false);
    } else {
      startAmbient();
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  /** Reads text aloud in French (no-op when voice-over is off). */
  const speak = (text: string | undefined) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    if (!voiceOn) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (voiceOn) {
      stopSpeech();
      setVoiceOn(false);
    } else {
      setVoiceOn(true);
    }
  };

  return { ambientOn, toggleAmbient, startAmbient, voiceOn, toggleVoice, isSpeaking, speak, stopSpeech };
}

export type AudioControls = ReturnType<typeof useAudio>;
