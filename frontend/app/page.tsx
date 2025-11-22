/**
 * Main Video Call Interface
 * Integrates all components for AI doctor consultation
 */
"use client";

import { useState } from "react";
import VideoFeed from "./components/VideoFeed";
import Avatar from "./components/Avatar";
import ChatDisplay from "./components/ChatDisplay";
import AudioController from "./components/AudioController";
import InsightsDashboard from "./components/InsightsDashboard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  emotion?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();

  // Handle emotion detection from VideoFeed
  const handleEmotionDetected = (emotion: string) => {
    setCurrentEmotion(emotion);
  };

  // Handle speech transcript from AudioController
  const handleTranscript = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      emotion: currentEmotion,
    };
    setMessages((prev) => [...prev, userMessage]);

    // TODO: Send to backend API
    // const response = await fetch('http://localhost:8000/api/chat', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message: text, emotion: currentEmotion })
    // });
    // const data = await response.json();

    // TODO: Get TTS audio
    // const ttsResponse = await fetch('http://localhost:8000/api/tts', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ text: data.response })
    // });
    // const ttsData = await ttsResponse.json();
    // setAudioUrl(ttsData.audio_url);

    // Add AI response (placeholder)
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "I understand. Can you tell me more about that?",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMessage]);
  };

  // Handle speaking state changes
  const handleSpeakingStateChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  // Request insights from backend
  const handleRequestInsights = async () => {
    // TODO: Call insights API
    // const response = await fetch('http://localhost:8000/api/insights', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     conversation: messages,
    //     emotions: [...],
    //     timestamps: [...]
    //   })
    // });
    console.log("Requesting insights...");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Doctor Consultation
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Video Feed */}
          <div className="lg:col-span-2 space-y-6">
            <VideoFeed onEmotionDetected={handleEmotionDetected} />

            <AudioController
              onTranscript={handleTranscript}
              onSpeakingStateChange={handleSpeakingStateChange}
            />
          </div>

          {/* Right Column - Avatar */}
          <div className="space-y-6">
            <Avatar isSpeaking={isSpeaking} audioUrl={audioUrl} />
          </div>
        </div>

        {/* Chat and Insights */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Display */}
          <div className="h-[500px]">
            <ChatDisplay messages={messages} />
          </div>

          {/* Insights Dashboard */}
          <div>
            <InsightsDashboard onRequestInsights={handleRequestInsights} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            AI Doctor - Virtual Health Consultation Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
