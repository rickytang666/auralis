/**
 * Face detection utilities using face-api.js
 */

import * as faceapi from 'face-api.js';

export interface EmotionResult {
  emotion: string;
  confidence: number;
  allEmotions: Record<string, number>;
}

// Use CDN for models - no manual download needed
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

/**
 * Load face-api.js models from CDN
 */
export async function loadFaceDetectionModels(modelPath: string = MODEL_URL): Promise<void> {
  try {
    console.log('Loading face detection models from CDN...');
    
    // Load required models for face detection and emotion recognition
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
    ]);
    
    console.log('✓ Face detection models loaded successfully');
  } catch (error) {
    console.error('Failed to load face detection models:', error);
    throw error;
  }
}

/**
 * Detect emotions from video element
 */
export async function detectEmotions(
  videoElement: HTMLVideoElement
): Promise<EmotionResult | null> {
  try {
    // Run face detection with expression recognition
    const detections = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();
    
    if (!detections) {
      return null; // No face detected
    }
    
    const expressions = detections.expressions;
    const dominantEmotion = getDominantEmotion(expressions);
    
    return {
      emotion: dominantEmotion.emotion,
      confidence: dominantEmotion.confidence,
      allEmotions: expressions.asSortedArray().reduce((acc, expr) => {
        acc[expr.expression] = expr.probability;
        return acc;
      }, {} as Record<string, number>)
    };
  } catch (error) {
    console.error('Error detecting emotions:', error);
    return null;
  }
}

/**
 * Get dominant emotion from expressions
 */
function getDominantEmotion(expressions: faceapi.FaceExpressions): {
  emotion: string;
  confidence: number;
} {
  const sorted = expressions.asSortedArray();
  
  if (sorted.length === 0) {
    return { emotion: 'neutral', confidence: 0 };
  }
  
  // Return the emotion with highest probability
  return {
    emotion: sorted[0].expression,
    confidence: sorted[0].probability
  };
}

/**
 * Draw face detection overlay on canvas
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: faceapi.WithFaceExpressions<{
    detection: faceapi.FaceDetection;
    landmarks: faceapi.FaceLandmarks68;
  }>,
  videoElement: HTMLVideoElement
): void {
  const displaySize = {
    width: videoElement.videoWidth,
    height: videoElement.videoHeight
  };
  
  // Match canvas dimensions to video
  faceapi.matchDimensions(canvas, displaySize);
  
  // Resize detection results to match display size
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  
  // Clear previous drawings
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Draw face bounding box
  faceapi.draw.drawDetections(canvas, resizedDetections);
  
  // Draw facial landmarks (optional - can be commented out for cleaner look)
  // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
}

/**
 * Start continuous emotion detection
 */
export function startEmotionDetection(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement | null,
  onEmotionDetected: (result: EmotionResult) => void,
  intervalMs: number = 1000
): () => void {
  let isRunning = true;
  
  const detectLoop = async () => {
    if (!isRunning) return;
    
    try {
      // Check if video is ready
      if (videoElement.readyState !== 4) {
        console.log("⏳ Video not ready yet, readyState:", videoElement.readyState);
        setTimeout(detectLoop, intervalMs);
        return;
      }
      
      // Detect emotions with landmarks
      const detections = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
      
      if (detections) {
        const expressions = detections.expressions;
        const dominantEmotion = getDominantEmotion(expressions);
        
        const result: EmotionResult = {
          emotion: dominantEmotion.emotion,
          confidence: dominantEmotion.confidence,
          allEmotions: expressions.asSortedArray().reduce((acc: Record<string, number>, expr: { expression: string; probability: number }) => {
            acc[expr.expression] = expr.probability;
            return acc;
          }, {} as Record<string, number>)
        };
        
        onEmotionDetected(result);
        
        // Draw detections on canvas if provided
        if (canvasElement) {
          drawDetections(canvasElement, detections, videoElement);
        }
      } else {
        console.log("⚠️  No face detected in frame");
      }
    } catch (error) {
      console.error('❌ Error in emotion detection loop:', error);
    }
    
    // Schedule next detection
    if (isRunning) {
      setTimeout(detectLoop, intervalMs);
    }
  };
  
  // Start the loop
  detectLoop();
  
  // Return cleanup function
  return () => {
    isRunning = false;
  };
}

