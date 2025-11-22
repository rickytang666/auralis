/**
 * AudioController Component
 * Handles audio recording (input) and audio playback (output)
 * Uses ElevenLabs STT/TTS via backend API
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { AudioRecorder, playAudio } from "@/lib/audioUtils";

interface AudioControllerProps {
  onTranscript?: (text: string) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onAssistantResponse?: (text: string) => void;
  autoStart?: boolean; // Auto-start listening when component mounts
  continuousMode?: boolean; // Automatically restart listening after AI speaks
}

export default function AudioController({
  onTranscript,
  onSpeakingStateChange,
  onAssistantResponse,
  autoStart = false,
  continuousMode = false,
}: AudioControllerProps) {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // New state for AI processing

  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldContinueListeningRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Track current playing audio

  useEffect(() => {
    // Initialize audio recorder
    recorderRef.current = new AudioRecorder();

    // Check microphone permission
    checkMicrophonePermission();

    return () => {
      // Cleanup - stop everything when component unmounts
      shouldContinueListeningRef.current = false;

      // Stop any timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Stop and cleanup all audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = "";
        currentAudioRef.current = null;
      }

      // Stop recording
      if (recorderRef.current && recorderRef.current.isRecording()) {
        recorderRef.current.stopRecording().catch(() => {});
      }
    };
  }, []);

  // Auto-start listening when permission is granted (for continuous mode)
  useEffect(() => {
    if (autoStart && hasPermission && !isListening && !isPlaying) {
      shouldContinueListeningRef.current = true;
      startListening();
    }
  }, [autoStart, hasPermission, isListening, isPlaying]);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
    } catch (err) {
      setHasPermission(false);
      setError("Microphone permission denied");
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setError(null);
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("http://localhost:8000/api/stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("STT request failed");
      }

      const data = await response.json();
      if (data.text) {
        setTranscript(data.text);
        onTranscript?.(data.text);

        // Mock chat response (replace with real API when Person 3 is ready)
        await handleChatResponse(data.text);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError("Failed to transcribe audio");
    }
  };

  const handleChatResponse = async (userMessage: string) => {
    try {
      setIsProcessing(true); // Show processing indicator

      // Call real Gemini chat API
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          emotion: "neutral", // TODO: Replace with real emotion from Person 2's face detection
        }),
      });

      if (!response.ok) {
        throw new Error("Chat API request failed");
      }

      const data = await response.json();

      if (data.response) {
        // Notify parent component of assistant response
        onAssistantResponse?.(data.response);

        // Send to TTS
        await speakText(data.response);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError("Failed to get response");
      if (continuousMode && shouldContinueListeningRef.current) {
        startListening(); // Restart listening even on error
      }
    } finally {
      setIsProcessing(false); // Hide processing indicator
    }
  };

  const speakText = async (text: string) => {
    try {
      setError(null);
      const response = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const data = await response.json();

      if (data.audio_base64) {
        // Convert base64 to playable URL
        const audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;

        // Stop any currently playing audio first
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current.src = "";
        }

        // Emit event for avatar
        window.dispatchEvent(new CustomEvent("audioPlaybackStart"));

        const audio = await playAudio(
          audioUrl,
          () => {
            setIsPlaying(true);
            onSpeakingStateChange?.(true);
          },
          () => {
            setIsPlaying(false);
            onSpeakingStateChange?.(false);
            window.dispatchEvent(new CustomEvent("audioPlaybackEnd"));
            currentAudioRef.current = null;

            // Auto-restart listening in continuous mode
            if (continuousMode && shouldContinueListeningRef.current) {
              setTimeout(() => {
                startListening();
              }, 500); // Small delay before restarting
            }
          },
          (error) => {
            setError(error);
            setIsPlaying(false);
            onSpeakingStateChange?.(false);
            currentAudioRef.current = null;

            // Still restart listening even on error
            if (continuousMode && shouldContinueListeningRef.current) {
              setTimeout(() => {
                startListening();
              }, 500);
            }
          }
        );

        // Track the current audio element
        currentAudioRef.current = audio;
      }
    } catch (err) {
      console.error("TTS error:", err);
      setError("Failed to generate speech");
    }
  };

  const startListening = async () => {
    if (!hasPermission) {
      await checkMicrophonePermission();
      return;
    }

    try {
      setError(null);
      if (recorderRef.current) {
        await recorderRef.current.startRecording();
        setIsListening(true);

        // In continuous mode, auto-stop after silence (3 seconds)
        if (continuousMode) {
          startSilenceDetection();
        }
      }
    } catch (err) {
      console.error("Recording start error:", err);
      setError("Failed to start recording");
    }
  };

  const startSilenceDetection = () => {
    // Clear any existing timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    // Auto-stop recording after 8 seconds to allow for longer responses
    // This gives users time to think and speak complete sentences
    silenceTimerRef.current = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.isRecording()) {
        stopListening();
      }
    }, 8000); // 8 seconds - much more reasonable for natural conversation
  };

  const stopListening = async () => {
    try {
      if (recorderRef.current && recorderRef.current.isRecording()) {
        const audioBlob = await recorderRef.current.stopRecording();
        await handleRecordingComplete(audioBlob);
        setIsListening(false);
      }
    } catch (err) {
      console.error("Recording stop error:", err);
      setError("Failed to stop recording");
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Visual indicator only (no button in continuous mode) */}
      {continuousMode ? (
        <div className="flex flex-col items-center space-y-3">
          {/* Status indicator */}
          <div
            className={`p-4 rounded-full transition-all ${
              isListening
                ? "bg-red-500/20 animate-pulse"
                : isPlaying
                ? "bg-blue-500/20"
                : "bg-gray-500/20"
            }`}
          >
            <svg
              className={`w-6 h-6 ${
                isListening
                  ? "text-red-600"
                  : isPlaying
                  ? "text-blue-600"
                  : "text-gray-600"
              }`}
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
          </div>

          {/* Status text */}
          <div className="text-center">
            {!hasPermission && (
              <p className="text-xs text-red-600 font-medium">
                Requesting microphone access...
              </p>
            )}
            {hasPermission && isListening && (
              <p className="text-xs text-red-600 font-medium">Listening...</p>
            )}
            {hasPermission && isProcessing && (
              <p className="text-xs text-yellow-600 font-medium animate-pulse">
                Thinking...
              </p>
            )}
            {hasPermission && isPlaying && (
              <p className="text-xs text-blue-600 font-medium">
                Doctor is speaking...
              </p>
            )}
            {hasPermission && !isListening && !isPlaying && !isProcessing && (
              <p className="text-xs text-gray-500">Ready</p>
            )}
          </div>

          {/* Done Speaking button - only show when listening */}
          {isListening && (
            <button
              onClick={stopListening}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors shadow-lg"
            >
              Done Speaking
            </button>
          )}
        </div>
      ) : (
        // Original button mode (for non-continuous use)
        <>
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isPlaying || !hasPermission}
            className={`p-6 rounded-full transition-all shadow-lg ${
              isListening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : isPlaying
                ? "bg-gray-400 cursor-not-allowed"
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

          <div className="text-center min-h-[24px]">
            {!hasPermission && (
              <p className="text-sm text-red-600">
                Microphone permission needed
              </p>
            )}
            {hasPermission && isListening && (
              <p className="text-sm text-red-600 font-medium">
                🎤 Listening...
              </p>
            )}
            {hasPermission && isPlaying && (
              <p className="text-sm text-blue-600 font-medium">
                🔊 Doctor is speaking...
              </p>
            )}
            {hasPermission && !isListening && !isPlaying && (
              <p className="text-sm text-gray-500">Click to speak</p>
            )}
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="max-w-md p-3 bg-red-100/80 backdrop-blur-sm border border-red-300 rounded-lg">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
