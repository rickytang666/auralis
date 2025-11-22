"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Avatar from "./Avatar";

interface CallInterfaceProps {
  onEndCall: () => void;
  selectedBg: string;
}

const BG_OPTIONS = [
  { id: "bg1", color: "from-blue-50 to-indigo-50" },
  { id: "bg2", color: "from-rose-50 to-orange-50" },
  { id: "bg3", color: "from-emerald-50 to-teal-50" },
];

export default function CallInterface({ onEndCall, selectedBg }: CallInterfaceProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const bgClass = BG_OPTIONS.find(b => b.id === selectedBg)?.color || "from-blue-50 to-indigo-50";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} p-4 md:p-6 flex flex-col transition-colors duration-500`}>
      {/* Header Controls */}
      <div className="flex justify-between items-center mb-6 z-10">
        <button 
          onClick={onEndCall}
          className="px-6 py-2 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 transition-colors shadow-lg hover:shadow-red-200"
        >
          END CALL
        </button>
        <div className="text-2xl font-mono font-medium text-gray-800 bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full">
          {formatTime(elapsedTime)}
        </div>
        <div className="w-[100px]"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex relative">
        {/* Main Avatar Area - Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl aspect-square">
            <Avatar background={bgClass} />
          </div>
        </div>

        {/* Webcam Feed Placeholder (Bottom Left) - Kept as per original request but user said "remove left hand side box", 
            but then said "entire page including around the webcam". 
            I will keep the webcam overlay but remove the container box. */}
        <div className="absolute bottom-6 left-6 w-48 h-36 bg-black/20 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border border-white/20 z-10">
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Right Side - Transcript Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-80 p-6 z-10 flex flex-col justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-6 h-[600px] flex flex-col pointer-events-auto">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Realtime Transcript</h3>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="bg-blue-100/80 p-3 rounded-2xl rounded-tl-none max-w-[90%]">
                <p className="text-sm text-gray-800">Hello! I'm your AI Doctor. How are you feeling today?</p>
              </div>
              <div className="bg-gray-100/80 p-3 rounded-2xl rounded-tr-none max-w-[90%] ml-auto">
                <p className="text-sm text-gray-800">I've been having some headaches lately.</p>
              </div>
              <div className="bg-blue-100/80 p-3 rounded-2xl rounded-tl-none max-w-[90%]">
                <p className="text-sm text-gray-800">I see. Can you describe where the pain is located?</p>
              </div>
              <div className="animate-pulse flex space-x-2 items-center p-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full bounce-1" />
                <div className="w-2 h-2 bg-gray-400 rounded-full bounce-2" />
                <div className="w-2 h-2 bg-gray-400 rounded-full bounce-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
