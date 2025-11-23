/**
 * Mock SmartSpectra Client
 * Use this for development/demo when native helper isn't available
 * Simulates realistic vital signs data
 */

export interface VitalsData {
  type: "vitals";
  timestamp: number;
  pulse: number;
  pulseConfidence: number;
  breathing: number;
  breathingConfidence: number;
}

export interface BreathingTrace {
  type: "breathing_trace";
  value: number;
}

export type SmartSpectraMessage = VitalsData | BreathingTrace;

export class MockSmartSpectraClient {
  private intervalId: NodeJS.Timeout | null = null;
  private traceIntervalId: NodeJS.Timeout | null = null;
  private onVitalsCallback?: (data: VitalsData) => void;
  private onBreathingTraceCallback?: (value: number) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onDistressDetectedCallback?: (isDistressed: boolean) => void;
  private connected = false;

  // Simulated baseline vitals
  private basePulse = 72;
  private baseBreathing = 15;
  private time = 0;

  constructor(private url: string = "ws://localhost:8765") {
    console.log("🎭 Mock SmartSpectra Client initialized");
  }

  connect(): void {
    console.log("🎭 Mock: Simulating connection...");
    
    setTimeout(() => {
      this.connected = true;
      console.log("🎭 Mock: Connected (simulated)");
      this.onConnectedCallback?.();
      
      // Start sending vitals every 2 seconds
      this.intervalId = setInterval(() => {
        this.generateVitals();
      }, 2000);

      // Start sending breathing trace at 30 FPS
      this.traceIntervalId = setInterval(() => {
        this.generateBreathingTrace();
      }, 33); // ~30 FPS

      // Send initial vitals immediately
      this.generateVitals();
    }, 500);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.traceIntervalId) {
      clearInterval(this.traceIntervalId);
      this.traceIntervalId = null;
    }

    this.connected = false;
    console.log("🎭 Mock: Disconnected");
    this.onDisconnectedCallback?.();
  }

  private generateVitals(): void {
    // Simulate natural variation in vitals
    const pulseVariation = (Math.random() - 0.5) * 10; // ±5 BPM
    const breathingVariation = (Math.random() - 0.5) * 4; // ±2 BPM
    
    // Add slow drift
    const drift = Math.sin(this.time / 30) * 5;
    
    const pulse = Math.round(
      Math.max(50, Math.min(120, this.basePulse + pulseVariation + drift))
    );
    
    const breathing = Math.round(
      Math.max(10, Math.min(25, this.baseBreathing + breathingVariation + drift / 2))
    );

    // Confidence varies slightly
    const pulseConfidence = 0.85 + Math.random() * 0.15; // 0.85-1.0
    const breathingConfidence = 0.85 + Math.random() * 0.15;

    const vitals: VitalsData = {
      type: "vitals",
      timestamp: Date.now() * 1000, // Microseconds
      pulse,
      pulseConfidence,
      breathing,
      breathingConfidence,
    };

    console.log(
      `🎭 Mock Vitals: Pulse ${pulse} BPM, Breathing ${breathing} BPM`
    );

    this.onVitalsCallback?.(vitals);
    
    // Check for distress: pulse > 100 AND breathing > 20
    const isDistressed = pulse > 100 && breathing > 20;
    this.onDistressDetectedCallback?.(isDistressed);
    
    this.time++;
  }

  private generateBreathingTrace(): void {
    // Simulate breathing waveform (slow sine wave)
    const breathingFrequency = this.baseBreathing / 60; // Hz
    const t = Date.now() / 1000;
    const value = Math.sin(t * breathingFrequency * 2 * Math.PI);

    this.onBreathingTraceCallback?.(value);
  }

  onVitals(callback: (data: VitalsData) => void): void {
    this.onVitalsCallback = callback;
  }

  onDistressDetected(callback: (isDistressed: boolean) => void): void {
    this.onDistressDetectedCallback = callback;
  }

  onBreathingTrace(callback: (value: number) => void): void {
    this.onBreathingTraceCallback = callback;
  }

  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export under same name for easy swap
export { MockSmartSpectraClient as SmartSpectraClient };
