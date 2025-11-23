/**
 * TypeScript definitions for face-api.js
 * Basic type definitions to prevent TypeScript errors
 */

declare module 'face-api.js' {
  export interface FaceDetection {
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    score: number;
  }

  export interface FaceLandmarks68 {
    positions: Array<{ x: number; y: number }>;
  }

  export interface FaceExpressions {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
    asSortedArray(): Array<{ expression: string; probability: number }>;
  }

  export interface WithFaceDetection<T> {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks<T> {
    landmarks: FaceLandmarks68;
  }

  export interface WithFaceExpressions<T> {
    expressions: FaceExpressions;
  }

  export interface WithAge<T> {
    age: number;
    gender: string;
    genderProbability: number;
  }

  export class TinyFaceDetectorOptions {
    constructor(options?: {
      inputSize?: number;
      scoreThreshold?: number;
    });
  }

  export interface FaceDetector {
    loadFromUri(uri: string): Promise<void>;
  }

  export const nets: {
    tinyFaceDetector: FaceDetector;
    faceExpressionNet: FaceDetector;
    faceLandmark68Net: FaceDetector;
    ageGenderNet: FaceDetector;
  };

  export function detectSingleFace(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    options?: TinyFaceDetectorOptions
  ): {
    withFaceExpressions(): Promise<
      WithFaceDetection<{}> & WithFaceExpressions<{}> | undefined
    >;
    withFaceLandmarks(): {
      withFaceExpressions(): {
        withAgeAndGender(): Promise<
          | (WithFaceDetection<{ detection: FaceDetection; landmarks: FaceLandmarks68 }> &
              WithFaceExpressions<{ detection: FaceDetection; landmarks: FaceLandmarks68 }> &
              WithAge<{ detection: FaceDetection; landmarks: FaceLandmarks68 }>)
          | undefined
        >;
        (): Promise<
          | (WithFaceDetection<{ detection: FaceDetection; landmarks: FaceLandmarks68 }> &
              WithFaceExpressions<{ detection: FaceDetection; landmarks: FaceLandmarks68 }>)
          | undefined
        >;
      };
    };
  };

  export function matchDimensions(
    canvas: HTMLCanvasElement,
    dimensions: { width: number; height: number }
  ): void;

  export function resizeResults<T>(
    results: T,
    dimensions: { width: number; height: number }
  ): T;

  export const draw: {
    drawDetections(
      canvas: HTMLCanvasElement,
      detections: any
    ): void;
    drawFaceLandmarks(
      canvas: HTMLCanvasElement,
      landmarks: any
    ): void;
  };
}

