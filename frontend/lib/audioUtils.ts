/**
 * Audio utilities for Web Speech API and audio playback
 */

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

/**
 * Initialize Web Speech API
 */
export function initializeSpeechRecognition(
  onResult: (result: SpeechRecognitionResult) => void,
  onError: (error: string) => void
): SpeechRecognition | null {
  // Check browser support
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError('Speech recognition not supported in this browser');
    return null;
  }

  // @ts-ignore - SpeechRecognition types
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const results = event.results;
    const lastResult = results[results.length - 1];
    
    onResult({
      transcript: lastResult[0].transcript,
      isFinal: lastResult.isFinal,
      confidence: lastResult[0].confidence
    });
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
  };

  return recognition;
}

/**
 * Play audio from URL or base64
 */
export async function playAudio(
  audioSource: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: string) => void
): Promise<HTMLAudioElement> {
  const audio = new Audio();
  
  audio.onplay = () => onStart?.();
  audio.onended = () => onEnd?.();
  audio.onerror = () => onError?.('Failed to play audio');
  
  // Check if base64 or URL
  if (audioSource.startsWith('data:')) {
    audio.src = audioSource;
  } else {
    audio.src = audioSource;
  }
  
  try {
    await audio.play();
    return audio;
  } catch (error) {
    onError?.('Audio playback failed');
    throw error;
  }
}

/**
 * Convert base64 to blob URL
 */
export function base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): string {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Analyze audio frequency for lip-sync
 */
export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }
  
  /**
   * Connect audio element to analyzer
   */
  connectAudio(audioElement: HTMLAudioElement): void {
    const source = this.audioContext.createMediaElementSource(audioElement);
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }
  
  /**
   * Get current audio volume (0-1)
   */
  getVolume(): number {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const sum = data.reduce((a, b) => a + b, 0);
    return sum / (data.length * 255);
  }
  
  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

/**
 * Request microphone access
 */
export async function requestMicrophoneAccess(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    throw new Error('Microphone access denied');
  }
}

