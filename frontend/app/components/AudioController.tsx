/**
 * AudioController Component
 * Handles speech recognition (input) and audio playback (output)
 */
"use client";

import { useState, useEffect, useRef } from "react";

interface AudioControllerProps {
  onTranscript?: (text: string) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
}

export default function AudioController({
  onTranscript,
  onSpeakingStateChange,
}: AudioControllerProps) {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // TODO: Initialize Web Speech API
    initializeSpeechRecognition();

    return () => {
      // TODO: Cleanup speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const initializeSpeechRecognition = () => {
    // TODO: Check browser support
    // if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    //   const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    //   recognitionRef.current = new SpeechRecognition();
    //   recognitionRef.current.continuous = true;
    //   recognitionRef.current.interimResults = true;
    //
    //   recognitionRef.current.onresult = handleSpeechResult;
    //   recognitionRef.current.onerror = handleSpeechError;
    // }
  };

  const handleSpeechResult = (event: any) => {
    // TODO: Process speech recognition results
    // TODO: Extract final transcript
    // TODO: Call onTranscript callback
  };

  const handleSpeechError = (event: any) => {
    console.error("Speech recognition error:", event.error);
    setIsListening(false);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const playAudio = async (audioUrl: string) => {
    // TODO: Play audio from URL
    // TODO: Update isPlaying state
    // TODO: Call onSpeakingStateChange callback
    try {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);
        onSpeakingStateChange?.(true);
      }
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    onSpeakingStateChange?.(false);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Microphone button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`p-6 rounded-full transition-all ${
          isListening
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>

      {/* Status text */}
      <div className="text-center">
        {isListening && <p className="text-sm text-gray-600">Listening...</p>}
        {isPlaying && (
          <p className="text-sm text-gray-600">Doctor is speaking...</p>
        )}
        {!isListening && !isPlaying && (
          <p className="text-sm text-gray-500">Click to speak</p>
        )}
      </div>

      {/* Live transcript */}
      {transcript && (
        <div className="max-w-md p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-700">{transcript}</p>
        </div>
      )}
    </div>
  );
}
