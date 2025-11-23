/**
 * VitalsDisplay Component
 * Shows real-time vital signs from SmartSpectra
 */
"use client";

import { motion } from "framer-motion";

interface VitalsDisplayProps {
  pulse: number | null;
  pulseConfidence: number;
  breathing: number | null;
  breathingConfidence: number;
  connected: boolean;
  isDistressed?: boolean;
}

export default function VitalsDisplay({
  pulse,
  pulseConfidence,
  breathing,
  breathingConfidence,
  connected,
  isDistressed = false,
}: VitalsDisplayProps) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-4 min-w-[200px]">
      {/* Distress Alert Banner */}
      {isDistressed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg mb-3 flex items-center gap-2"
        >
          <span className="text-lg">⚠️</span>
          <span>Elevated vitals detected</span>
        </motion.div>
      )}
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        />
        <span className="text-xs font-medium text-gray-600">
          {connected ? "SmartSpectra Active" : "Disconnected"}
        </span>
      </div>

      {/* Pulse Rate */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Pulse
          </span>
          {pulse !== null && (
            <span className="text-xs text-gray-400">
              {Math.round(pulseConfidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          {pulse !== null ? (
            <>
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-red-600"
              >
                {pulse}
              </motion.span>
              <span className="text-sm text-gray-500">BPM</span>
            </>
          ) : (
            <span className="text-lg text-gray-400">--</span>
          )}
        </div>
        {pulse !== null && (
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pulseConfidence * 100}%` }}
              className="h-full bg-red-500"
            />
          </div>
        )}
      </div>

      {/* Breathing Rate */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Breathing
          </span>
          {breathing !== null && (
            <span className="text-xs text-gray-400">
              {Math.round(breathingConfidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          {breathing !== null ? (
            <>
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-blue-600"
              >
                {breathing}
              </motion.span>
              <span className="text-sm text-gray-500">BPM</span>
            </>
          ) : (
            <span className="text-lg text-gray-400">--</span>
          )}
        </div>
        {breathing !== null && (
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${breathingConfidence * 100}%` }}
              className="h-full bg-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
