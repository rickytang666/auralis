/**
 * VideoFeed Component
 * Handles webcam feed and face-api.js emotion detection
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface VideoFeedProps {
  onEmotionDetected?: (emotion: string) => void;
}

export default function VideoFeed({ onEmotionDetected }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");

  useEffect(() => {
    // TODO: Initialize webcam
    // TODO: Load face-api.js models
    // TODO: Start emotion detection loop

    startWebcam();

    return () => {
      // TODO: Cleanup webcam and detection
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      // TODO: Get user media
      // const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // if (videoRef.current) {
      //   videoRef.current.srcObject = stream;
      // }
      setIsLoading(false);
    } catch (err) {
      setError("Failed to access webcam");
      setIsLoading(false);
    }
  };

  const stopWebcam = () => {
    // TODO: Stop all video tracks
  };

  const detectEmotions = async () => {
    // TODO: Run face-api.js detection
    // TODO: Extract dominant emotion
    // TODO: Call onEmotionDetected callback
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <p className="text-white">Loading camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>

      {/* Emotion indicator */}
      <div className="mt-4 text-center">
        <span className="text-sm text-gray-600">
          Detected emotion:{" "}
          <span className="font-semibold">{currentEmotion}</span>
        </span>
      </div>
    </div>
  );
}
