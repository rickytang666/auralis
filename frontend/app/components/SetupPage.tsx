"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";
import Image from "next/image";
import doctormImg from "../avatar_images/doctorm.png";
import doctorfImg from "../avatar_images/doctorf.png";
import baymaxImg from "../avatar_images/baymax.png";

interface SetupPageProps {
  onConnect: () => void;
  selectedBg: string;
  setSelectedBg: (bg: string) => void;
  onBack: () => void;
  selectedAvatar: string;
  setSelectedAvatar: (id: string) => void;
  selectedVoice: string;
  setSelectedVoice: (id: string) => void;
}

const AVATAR_OPTIONS = [
  { id: "doctorm", name: "Doctor M", color: "bg-blue-100", image: doctormImg },
  { id: "doctorf", name: "Doctor F", color: "bg-purple-100", image: doctorfImg },
  { id: "baymax", name: "Baymax", color: "bg-red-100", image: baymaxImg },
];



const BG_OPTIONS = [
  { id: "bg1", color: "from-blue-50 to-indigo-50" },
  { id: "bg2", color: "from-rose-50 to-orange-50" },
  { id: "bg3", color: "from-emerald-50 to-teal-50" },
];

export default function SetupPage({
  onConnect,
  selectedBg,
  setSelectedBg,
  onBack,
  selectedAvatar,
  setSelectedAvatar,
  selectedVoice,
  setSelectedVoice,
}: SetupPageProps) {
  // Voice options mapped by avatar ID
  const VOICE_MAP: Record<string, { id: string; name: string }[]> = {
    doctorm: [
      { id: "Sq93GQT4X1lKDXsQcixO", name: "Felix" },
      { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
      { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
    ],
    doctorf: [
      { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
      { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
      { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica" },
    ],
    baymax: [
      { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
      { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew" },
      { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde" },
    ],
  };

  // Get current voice options based on selected avatar
  const currentVoiceOptions = VOICE_MAP[selectedAvatar] || VOICE_MAP["doctorm"];

  // Update selected voice when avatar changes (default to first option)
  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    const defaultVoice = VOICE_MAP[avatarId]?.[0]?.id;
    if (defaultVoice) {
      setSelectedVoice(defaultVoice);
    }
  };

  const playVoicePreview = async (voiceId: string) => {
    try {
      const response = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Hey! I am your personalized AI Doctor",
          voice_id: voiceId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate preview");

      const data = await response.json();
      if (data.audio_base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
        await audio.play();
      }
    } catch (error) {
      console.error("Error playing voice preview:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]"
      >
        {/* Left Side - Avatar Preview */}
        <div
          className={`w-full md:w-1/2 p-8 flex flex-col items-center justify-center bg-gradient-to-br ${
            BG_OPTIONS.find((b) => b.id === selectedBg)?.color
          } transition-colors duration-500 relative`}
        >
          <div className="w-full max-w-md aspect-square relative z-10">
            <Avatar
              background={BG_OPTIONS.find((b) => b.id === selectedBg)?.color}
              avatarId={selectedAvatar}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConnect}
            className="mt-8 w-full max-w-xs bg-black text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 group z-10"
          >
            <span>Connect with AIDoc</span>
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </motion.button>
        </div>

        {/* Right Side - Customization */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-black">Setup Profile</h2>
            <button
              onClick={onBack}
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Back to Home
            </button>
          </div>

          <div className="space-y-8">
            {/* Avatar Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-black">Avatar</h3>
              <div className="flex space-x-4">
                {AVATAR_OPTIONS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => handleAvatarChange(avatar.id)}
                    className={`flex flex-col items-center space-y-2 group ${
                      selectedAvatar === avatar.id
                        ? "opacity-100"
                        : "opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-full ${
                        avatar.color
                      } border-2 ${
                        selectedAvatar === avatar.id
                          ? "border-black"
                          : "border-transparent"
                      } transition-all flex items-center justify-center relative overflow-hidden`}
                    >
                      <Image
                        src={avatar.image}
                        alt={avatar.name}
                        fill
                        className="object-cover"
                      />
                      {selectedAvatar === avatar.id && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-black">
                      {avatar.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-black">Voice</h3>
              <div className="flex space-x-4">
                {currentVoiceOptions.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice.id);
                      playVoicePreview(voice.id);
                    }}
                    className={`flex flex-col items-center space-y-2 ${
                      selectedVoice === voice.id
                        ? "opacity-100"
                        : "opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-full bg-gray-100 border-2 ${
                        selectedVoice === voice.id
                          ? "border-black"
                          : "border-transparent"
                      } transition-all flex items-center justify-center`}
                    >
                      {selectedVoice === voice.id && (
                        <svg
                          className="w-6 h-6 text-black"
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
                      )}
                    </div>
                    <span className="text-sm font-medium text-black">
                      {voice.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-black">
                Background
              </h3>
              <div className="flex space-x-4">
                {BG_OPTIONS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBg(bg.id)}
                    className={`w-16 h-12 rounded-lg bg-gradient-to-br ${
                      bg.color
                    } border-2 ${
                      selectedBg === bg.id ? "border-black" : "border-transparent"
                    } transition-all shadow-sm`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
