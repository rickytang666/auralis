/**
 * VideoFeed Component
 * Handles webcam feed and face-api.js emotion detection
 */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadFaceDetectionModels,
  startEmotionDetection,
  EmotionResult,
} from "@/lib/faceDetection";

interface VideoFeedProps {
  onEmotionDetected?: (emotion: string) => void;
}

export default function VideoFeed({ onEmotionDetected }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cleanupDetectionRef = useRef<(() => void) | null>(null);
  const modelsLoadedRef = useRef<boolean>(false); // Use ref to avoid closure issues

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>("neutral");
  const [confidence, setConfidence] = useState<number>(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    initializeVideoFeed();

    return () => {
      cleanup();
    };
  }, []);

  const initializeVideoFeed = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load face detection models from CDN
      console.log("📦 Loading face detection models from CDN...");
      await loadFaceDetectionModels();
      modelsLoadedRef.current = true; // Set ref immediately
      setModelsLoaded(true); // Also set state for UI
      console.log("✓ Models loaded successfully (ref set to true)");

      // Request webcam access
      console.log("📹 Requesting webcam access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      console.log("✓ Webcam stream obtained");

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("✓ Video metadata loaded");
          videoRef.current?.play();

          // Wait for video to actually start playing
          videoRef.current!.onplaying = () => {
            console.log("✓ Video is now playing");
            setIsLoading(false);

            // Start detection after video is playing
            setTimeout(() => {
              console.log(
                "⏰ Attempting to start detection after 1000ms delay..."
              );
              startDetection();
            }, 1000); // Increased delay to ensure everything is ready
          };
        };
      }
    } catch (err) {
      console.error("❌ Error initializing video feed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to access webcam. Please grant camera permissions."
      );
      setIsLoading(false);
    }
  };

  const startDetection = () => {
    // Check if already running
    if (cleanupDetectionRef.current) {
      console.log("⚠️  Detection already running, skipping...");
      return;
    }

    // Use ref instead of state to avoid closure issues
    if (!videoRef.current || !modelsLoadedRef.current) {
      console.log("❌ Cannot start detection - video or models not ready");
      console.log("  - videoRef.current:", !!videoRef.current);
      console.log("  - modelsLoadedRef.current:", modelsLoadedRef.current);
      console.log("  - modelsLoaded state:", modelsLoaded);
      console.log("  - Video ready state:", videoRef.current?.readyState);

      // If models are loaded but state hasn't updated, try again
      if (
        videoRef.current &&
        videoRef.current.readyState === 4 &&
        !modelsLoadedRef.current
      ) {
        console.log("⏳ Waiting for models to load, retrying in 500ms...");
        setTimeout(() => startDetection(), 500);
      }
      return;
    }

    // Ensure video is fully ready
    if (videoRef.current.readyState !== 4) {
      console.log(
        "⏳ Video not ready yet, readyState:",
        videoRef.current.readyState
      );
      // Try again in 500ms
      setTimeout(() => startDetection(), 500);
      return;
    }

    console.log("✅ Starting emotion detection NOW!");
    console.log("  - Video ready state:", videoRef.current.readyState);
    console.log(
      "  - Video dimensions:",
      videoRef.current.videoWidth,
      "x",
      videoRef.current.videoHeight
    );
    console.log("  - Models loaded (ref):", modelsLoadedRef.current);
    console.log("  - Models loaded (state):", modelsLoaded);

    // Start continuous emotion detection (every 1 second)
    cleanupDetectionRef.current = startEmotionDetection(
      videoRef.current,
      canvasRef.current,
      (result: EmotionResult) => {
        console.log(
          "🎭 EMOTION DETECTED:",
          result.emotion,
          `(${(result.confidence * 100).toFixed(1)}% confidence)`
        );
        console.log("  - All emotions:", result.allEmotions);

        setCurrentEmotion(result.emotion);
        setConfidence(result.confidence);

        // Notify parent component
        onEmotionDetected?.(result.emotion);
      },
      1000 // Detect every 1 second
    );
  };

  const cleanup = () => {
    console.log("Cleaning up video feed...");

    // Stop emotion detection
    if (cleanupDetectionRef.current) {
      cleanupDetectionRef.current();
      cleanupDetectionRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      happy: "text-yellow-400",
      sad: "text-blue-400",
      angry: "text-red-400",
      fearful: "text-purple-400",
      surprised: "text-pink-400",
      disgusted: "text-green-400",
      neutral: "text-gray-400",
    };
    return colors[emotion] || "text-gray-400";
  };

  return (
    <div className="relative w-full h-full">
      <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover mirror"
          style={{ transform: "scaleX(-1)" }} // Mirror the video
        />

        {/* Canvas for face detection overlay */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }} // Mirror the canvas too
        />

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-white text-xs">Loading camera...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center px-4">
              <svg
                className="w-8 h-8 text-red-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Emotion indicator overlay */}
        {!isLoading && !error && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-medium">Emotion:</span>
                <span
                  className={`text-xs font-bold capitalize ${getEmotionColor(
                    currentEmotion
                  )}`}
                >
                  {currentEmotion}
                </span>
              </div>
              {confidence > 0 && (
                <div className="mt-1">
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-white h-1 rounded-full transition-all"
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
