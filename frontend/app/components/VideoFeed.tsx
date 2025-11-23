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
  onEmotionDetected?: (
    emotion: string,
    age?: number,
    ageCategory?: string
  ) => void;
  onConfidenceUpdate?: (confidence: number) => void;
}

type WebcamPhase = "analyzing" | "connected" | "emotion";

export default function VideoFeed({ onEmotionDetected, onConfidenceUpdate }: VideoFeedProps) {
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
  const [currentAge, setCurrentAge] = useState<number | null>(null);
  const [ageCategory, setAgeCategory] = useState<string | null>(null);
  const [webcamPhase, setWebcamPhase] = useState<WebcamPhase>("analyzing");
  const ageSamples = useRef<number[]>([]); // Collect age samples
  const ageLocked = useRef<boolean>(false); // Lock age after sampling complete
  const AGE_SAMPLE_COUNT = 3; // Number of samples to collect

  useEffect(() => {
    initializeVideoFeed();

    return () => {
      cleanup();
    };
  }, []);

  // Phase transition: analyzing (3s) → connected (2s) → emotion
  useEffect(() => {
    if (!isLoading && !error) {
      // Start with analyzing phase
      setWebcamPhase("analyzing");

      // After 2 seconds, transition to connected
      const analyzingTimer = setTimeout(() => {
        setWebcamPhase("connected");

        // After 2 more seconds, transition to emotion display
        const connectedTimer = setTimeout(() => {
          setWebcamPhase("emotion");
        }, 2000);

        return () => clearTimeout(connectedTimer);
      }, 2000);

      return () => clearTimeout(analyzingTimer);
    }
  }, [isLoading, error]);

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

        // Collect age samples for the first few detections
        if (!ageLocked.current && result.age !== undefined) {
          ageSamples.current.push(result.age);
          console.log(
            `👤 Age sample ${ageSamples.current.length}/${AGE_SAMPLE_COUNT}: ${result.age}`
          );

          // Once we have enough samples, calculate average and lock
          if (ageSamples.current.length >= AGE_SAMPLE_COUNT) {
            const avgAge = Math.round(
              ageSamples.current.reduce((sum, age) => sum + age, 0) /
                ageSamples.current.length
            );

            // Categorize the average age
            let category = "Young Adult";
            if (avgAge < 13) category = "Child";
            else if (avgAge < 20) category = "Teenager";
            else if (avgAge < 36) category = "Young Adult";
            else if (avgAge < 56) category = "Middle-Aged";
            else if (avgAge < 71) category = "Senior";
            else category = "Elderly";

            console.log(
              `👤 AGE LOCKED: ${avgAge} (${category}) - averaged from [${ageSamples.current.join(
                ", "
              )}]`
            );
            setCurrentAge(avgAge);
            setAgeCategory(category);
            ageLocked.current = true;

            // Notify parent component with finalized age
            onEmotionDetected?.(result.emotion, avgAge, category);
          }
        } else if (ageLocked.current) {
          // After age is locked, only send emotion updates with locked age
          onEmotionDetected?.(
            result.emotion,
            currentAge ?? undefined,
            ageCategory ?? undefined
          );
        }

        // Always update emotion
        setCurrentEmotion(result.emotion);
        setConfidence(result.confidence);
        onConfidenceUpdate?.(result.confidence);
      },
      1000, // Detect every 1 second
      () => !ageLocked.current // Only detect age until locked
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

        {/* White Mesh Animation Overlay - Analyzing Phase */}
        {!isLoading && !error && webcamPhase === "analyzing" && (
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]">
            {/* Animated mesh grid - WHITE */}
            <svg
              className="absolute inset-0 w-full h-full opacity-40"
              style={{ mixBlendMode: "screen" }}
            >
              <defs>
                <pattern
                  id="mesh-grid"
                  x="0"
                  y="0"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mesh-grid)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  from="0 0"
                  to="40 40"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </rect>
            </svg>

            {/* Scanning lines - WHITE */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50"
                style={{
                  animation: "scan-vertical 1.5s ease-in-out infinite",
                }}
              />
              <div
                className="absolute h-full w-1 bg-gradient-to-b from-transparent via-white to-transparent opacity-50"
                style={{
                  animation: "scan-horizontal 1.5s ease-in-out infinite",
                }}
              />
            </div>

            {/* Analyzing text - Simple white */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/30">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping absolute" />
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <span className="text-white text-sm font-medium">
                    Analyzing features...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}
