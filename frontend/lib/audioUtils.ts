/**
 * Audio utilities for recording and playback (ElevenLabs STT/TTS via backend)
 */

/**
 * Audio recorder class for capturing microphone input
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      throw new Error('Failed to start recording: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
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

// ...

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array;
  private timeDomainData: Uint8Array;
  private source: MediaElementAudioSourceNode | null = null;
  
  constructor() {
    if (typeof window === 'undefined') {
      this.freqData = new Uint8Array(0);
      this.timeDomainData = new Uint8Array(0);
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    const bufferLength = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
  }
  
  /**
   * Connect audio element to analyzer
   */
  connectAudio(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || !this.analyser) return;

    if (this.source) {
      this.source.disconnect();
    }
    this.source = this.audioContext.createMediaElementSource(audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  disconnect(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (error) {
        console.warn('AudioAnalyzer disconnect error', error);
      }
      this.source = null;
    }
    try {
      this.analyser?.disconnect();
    } catch (error) {
      console.warn('Analyser disconnect error', error);
    }
    this.audioContext?.close();
  }
  
  /**
   * Get current audio volume (0-1)
   */
  getVolume(): number {
    if (!this.analyser) return 0;

    this.analyser.getByteTimeDomainData(this.timeDomainData as any);
    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const sample = (this.timeDomainData[i] - 128) / 128; // normalize -1..1
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / this.timeDomainData.length);
    return Math.min(1, rms * 4); // boost to make speech movement visible
  }
  
  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);

    this.analyser.getByteFrequencyData(this.freqData as any);
    return this.freqData;
  }
}

/**
 * Request microphone access
 */
export async function requestMicrophoneAccess(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    throw new Error('Microphone access denied: ' + (error instanceof Error ? error.message : String(error)));
  }
}

