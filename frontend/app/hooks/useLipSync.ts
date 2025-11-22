/**
 * useLipSync Hook
 * Analyzes audio and provides smoothed amplitude for mouth animation
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface UseLipSyncOptions {
  smoothing?: number;
  threshold?: number;
  gain?: number;
}

export function useLipSync(
  audioUrl: string | null,
  options: UseLipSyncOptions = {}
) {
  const {
    smoothing = 0.7,
    threshold = 0.01,
    gain = 3.0,
  } = options;

  const [mouthValue, setMouthValue] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedValueRef = useRef(0);

  useEffect(() => {
    if (!audioUrl) {
      cleanup();
      return;
    }

    const initAudio = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create audio element
        const audio = new Audio(audioUrl);
        audio.crossOrigin = "anonymous";
        audioElementRef.current = audio;

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = smoothing;
        analyserRef.current = analyser;

        // Connect audio element to analyser
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // Start playing
        await audio.play();

        // Start analysis loop
        startAnalysis();
      } catch (error) {
        console.error("Error initializing lip sync:", error);
      }
    };

    initAudio();

    return () => {
      cleanup();
    };
  }, [audioUrl, smoothing]);

  const startAnalysis = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS (root mean square) for amplitude
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = dataArray[i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Apply threshold and gain
      let value = Math.max(0, (rms - threshold) * gain);
      value = Math.min(1, value);

      // Smooth the value using exponential moving average
      smoothedValueRef.current =
        smoothedValueRef.current * 0.7 + value * 0.3;

      setMouthValue(smoothedValueRef.current);

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  };

  const cleanup = () => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop and cleanup audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset values
    setMouthValue(0);
    smoothedValueRef.current = 0;
  };

  return mouthValue;
}
