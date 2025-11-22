"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import AudioController from "./AudioController";
import VideoFeed from "./VideoFeed";

interface CallInterfaceProps {
  onEndCall: (messages: Message[]) => void;
  selectedBg: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const BG_OPTIONS = [
  { id: "bg1", color: "from-blue-50 to-indigo-50" },
  { id: "bg2", color: "from-rose-50 to-orange-50" },
  { id: "bg3", color: "from-emerald-50 to-teal-50" },
];

export default function CallInterface({
  onEndCall,
  selectedBg,
}: CallInterfaceProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI Doctor. How are you feeling today?",
      timestamp: new Date(),
    },
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasSpokenGreeting, setHasSpokenGreeting] = useState(false);
  const [shouldStartListening, setShouldStartListening] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [emotionHistory, setEmotionHistory] = useState<string[]>([]); // Track emotions during speaking
  const [showEndPrompt, setShowEndPrompt] = useState(false); // Show end consultation prompt

  // Function to stop all audio and end call
  const handleEndCall = () => {
    console.log("🛑 Ending call - stopping all audio and listening");

    // Stop all audio elements
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = ""; // Clear source to fully stop
    });

    // Dispatch events to stop everything
    window.dispatchEvent(new CustomEvent("audioPlaybackEnd"));
    window.dispatchEvent(new CustomEvent("forceStopListening")); // New event to stop recording

    // Stop any ongoing speech recognition
    try {
      const recognition = (window as any).recognition;
      if (recognition) {
        recognition.stop();
      }
    } catch (e) {
      console.log("No active speech recognition to stop");
    }

    // End the call
    onEndCall(messages);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for end consultation suggestion from AI
  useEffect(() => {
    const handleEndSuggestion = () => {
      setShowEndPrompt(true);
    };

    window.addEventListener("suggestEndConsultation", handleEndSuggestion);
    return () => {
      window.removeEventListener("suggestEndConsultation", handleEndSuggestion);
    };
  }, []);

  // Speak the initial greeting ONLY when avatar is loaded
  useEffect(() => {
    if (isAvatarLoaded && !hasSpokenGreeting) {
      speakInitialGreeting();
      setHasSpokenGreeting(true);
    }
  }, [isAvatarLoaded, hasSpokenGreeting]);

  const speakInitialGreeting = async () => {
    const greeting = "Hello! I'm your AI Doctor. How are you feeling today?";

    try {
      const response = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: greeting }),
      });

      if (!response.ok) {
        console.error("Failed to generate greeting TTS");
        return;
      }

      const data = await response.json();

      if (data.audio_base64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
          setIsSpeaking(true);
          window.dispatchEvent(new CustomEvent("audioPlaybackStart"));
        };

        audio.onended = () => {
          setIsSpeaking(false);
          window.dispatchEvent(new CustomEvent("audioPlaybackEnd"));
          // Enable listening after greeting finishes
          setShouldStartListening(true);
        };

        audio.onerror = () => {
          console.error("Failed to play greeting audio");
          setIsSpeaking(false);
        };

        await audio.play();
      }
    } catch (err) {
      console.error("Error speaking greeting:", err);
    }
  };

  const handleTranscript = (text: string) => {
    // Add user message to transcript
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSpeakingStateChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const handleAssistantResponse = (text: string) => {
    // Add assistant message to transcript
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: text,
        timestamp: new Date(),
      },
    ]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const bgClass =
    BG_OPTIONS.find((b) => b.id === selectedBg)?.color ||
    "from-blue-50 to-indigo-50";

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${bgClass} p-4 md:p-6 flex flex-col transition-colors duration-500`}
    >
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6 z-10">
        <button
          onClick={handleEndCall}
          className="px-6 py-2 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 transition-colors shadow-lg hover:shadow-red-200"
        >
          END CALL
        </button>
        <div className="flex items-center gap-4">
          <div className="text-2xl font-mono font-medium text-gray-800 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full">
            {formatTime(elapsedTime)}
          </div>
          {/* Real-time Emotion Indicator */}
          <div className="bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">
                Emotion:
              </span>
              <span className="text-sm font-bold text-blue-600 capitalize animate-pulse">
                {currentEmotion}
              </span>
            </div>
          </div>
        </div>
        <div className="w-[100px]"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex relative">
        {/* Main Avatar Area - Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl aspect-square relative">
            {/* Loading indicator */}
            {!isAvatarLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg z-10">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">
                    Loading AI Doctor...
                  </p>
                </div>
              </div>
            )}

            <Avatar
              background={bgClass}
              onLoad={() => setIsAvatarLoaded(true)}
              fullscreen={true}
            />
          </div>
        </div>

        {/* Webcam Feed with Emotion Detection (Bottom Left) */}
        <div className="absolute bottom-6 left-6 w-48 h-36 rounded-xl overflow-hidden shadow-lg border border-white/20 z-10">
          <VideoFeed
            onEmotionDetected={(emotion) => {
              console.log("📤 CallInterface received emotion:", emotion);
              setCurrentEmotion(emotion);

              // Track emotion history (keep last 10 emotions)
              setEmotionHistory((prev) => [...prev.slice(-9), emotion]);
            }}
          />
        </div>

        {/* Right Side - Transcript Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-80 p-6 z-10 flex flex-col justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-6 h-[600px] flex flex-col pointer-events-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Realtime Transcript
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl max-w-[90%] ${
                    msg.role === "assistant"
                      ? "bg-blue-100/80 rounded-tl-none"
                      : "bg-gray-100/80 rounded-tr-none ml-auto"
                  }`}
                >
                  <p className="text-sm text-gray-800">{msg.content}</p>
                </div>
              ))}
              {isSpeaking && (
                <div className="animate-pulse flex space-x-2 items-center p-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full bounce-1" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full bounce-2" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full bounce-3" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Controller - Bottom Center */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <AudioController
            onTranscript={handleTranscript}
            onSpeakingStateChange={handleSpeakingStateChange}
            onAssistantResponse={handleAssistantResponse}
            autoStart={shouldStartListening}
            continuousMode={true}
            currentEmotion={currentEmotion}
            emotionHistory={emotionHistory}
            onClearEmotionHistory={() => setEmotionHistory([])}
          />
        </div>

        {/* End Consultation Prompt */}
        {showEndPrompt && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                End Consultation?
              </h3>
              <p className="text-gray-600 mb-6">
                The doctor has finished addressing your concerns. Would you like
                to end the consultation and view your summary?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndPrompt(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Continue Talking
                </button>
                <button
                  onClick={handleEndCall}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  End & View Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
