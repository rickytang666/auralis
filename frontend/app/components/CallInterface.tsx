"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import AudioController from "./AudioController";
import VideoFeed from "./VideoFeed";

interface CallInterfaceProps {
  onEndCall: (messages: Message[]) => void;
  selectedBg: string;
  avatarId: string;
  selectedAvatar?: string;
  selectedVoice?: string;
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
  avatarId,
  selectedAvatar = "doctorm",
  selectedVoice,
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
  const [confidence, setConfidence] = useState<number>(0);
  const [emotionHistory, setEmotionHistory] = useState<string[]>([]); // Track emotions during speaking
  const [showEndPrompt, setShowEndPrompt] = useState(false); // Show end consultation prompt
  const [currentAge, setCurrentAge] = useState<number | null>(null);
  const [ageCategory, setAgeCategory] = useState<string | null>(null);

  // Get doctor name from avatar selection
  const doctorName = selectedAvatar === "doctorf" ? "Doctor F" : selectedAvatar === "baymax" ? "Baymax" : "Doctor M";

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

    setIsSpeaking(false);

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
        body: JSON.stringify({ text: greeting, voice_id: selectedVoice }),
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
    console.log("CallInterface: Speaking state changed to:", speaking);
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
          className="px-6 py-2 bg-rose-400 text-white rounded-full text-sm font-bold hover:bg-rose-500 hover:opacity-90 transition-all shadow-lg hover:shadow-rose-200"
        >
          END CALL
        </button>
        <div className="flex items-center gap-4">
          <div className="text-2xl font-serif font-medium text-gray-800 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full">
            {formatTime(elapsedTime)}
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
              isSpeaking={isSpeaking}
              avatarId={avatarId}
            />
          </div>
        </div>


        {/* Webcam Feed with Emotion Detection (Bottom Left) - Resized (25% smaller) */}
        <div className="absolute bottom-24 left-8 z-10">
          {/* Webcam container - 300x225 (75% of 400x300) */}
          <div className="w-[300px] h-[225px] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 backdrop-blur-sm">
            <VideoFeed
              onEmotionDetected={(emotion, age, ageCat) => {
                console.log("📤 CallInterface received emotion:", emotion);
                setCurrentEmotion(emotion);

                // Track emotion history (keep last 10 emotions)
                setEmotionHistory((prev) => [...prev.slice(-9), emotion]);

                // Update age when received
                if (age !== undefined && ageCat) {
                  console.log("📤 CallInterface received age:", age, ageCat);
                  setCurrentAge(age);
                  setAgeCategory(ageCat);
                }
              }}
              onConfidenceUpdate={(conf) => {
                setConfidence(conf);
              }}
            />
          </div>

          {/* Confidence box below webcam - with emotion, confidence bar, and age */}
          <div className="mt-4 w-[300px]">
            <div className="bg-gray-900/90 backdrop-blur-md rounded-xl px-5 py-4 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-semibold">
                  Emotion:
                </span>
                <span
                  className={`text-base font-bold capitalize ${
                    currentEmotion === "happy"
                      ? "text-yellow-400"
                      : currentEmotion === "sad"
                      ? "text-blue-400"
                      : currentEmotion === "angry"
                      ? "text-red-400"
                      : currentEmotion === "fearful"
                      ? "text-purple-400"
                      : currentEmotion === "surprised"
                      ? "text-pink-400"
                      : currentEmotion === "disgusted"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {currentEmotion}
                </span>
              </div>
              
              {/* Confidence label and bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-xs font-medium">
                    Confidence
                  </span>
                  <span className="text-white text-xs font-bold">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      currentEmotion === "happy"
                        ? "bg-gradient-to-r from-yellow-400 to-yellow-300"
                        : currentEmotion === "sad"
                        ? "bg-gradient-to-r from-blue-400 to-blue-300"
                        : currentEmotion === "angry"
                        ? "bg-gradient-to-r from-red-400 to-red-300"
                        : currentEmotion === "fearful"
                        ? "bg-gradient-to-r from-purple-400 to-purple-300"
                        : currentEmotion === "surprised"
                        ? "bg-gradient-to-r from-pink-400 to-pink-300"
                        : currentEmotion === "disgusted"
                        ? "bg-gradient-to-r from-green-400 to-green-300"
                        : "bg-gradient-to-r from-gray-400 to-gray-300"
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Age group display */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-white/70 text-xs font-medium">
                  Estimated Age
                </span>
                <span className="text-cyan-400 text-sm font-bold">
                  {ageCategory || "Detecting..."}
                </span>
              </div>
            </div>
          </div>
        </div>


        {/* Right Side - Transcript Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-96 p-4 pr-2 z-10 flex flex-col justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-6 h-[600px] flex flex-col pointer-events-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Realtime Transcript
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-1">
                  {/* Speaker label */}
                  <div className={`text-xs font-semibold ${
                    msg.role === "assistant" ? "text-blue-600" : "text-gray-600"
                  }`}>
                    {msg.role === "assistant" ? doctorName : "User"}
                  </div>
                  {/* Message bubble */}
                  <div
                    className={`p-3 rounded-2xl max-w-[90%] ${
                      msg.role === "assistant"
                        ? "bg-blue-100/80 rounded-tl-none"
                        : "bg-gray-100/80 rounded-tr-none ml-auto"
                    }`}
                  >
                    <p className="text-sm text-gray-800">{msg.content}</p>
                  </div>
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
            currentAge={currentAge}
            ageCategory={ageCategory}
            voiceId={selectedVoice}
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
