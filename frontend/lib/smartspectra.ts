/**
 * SmartSpectra WebSocket Client
 * Connects to native helper and receives vitals
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

export class SmartSpectraClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private onVitalsCallback?: (data: VitalsData) => void;
  private onBreathingTraceCallback?: (value: number) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onDistressDetectedCallback?: (isDistressed: boolean) => void;

  constructor(private url: string = "ws://localhost:8765") {}

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("SmartSpectra: Connected to native helper");
        this.onConnectedCallback?.();
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: SmartSpectraMessage = JSON.parse(event.data);
          
          if (data.type === "vitals") {
            this.onVitalsCallback?.(data);
            
            // Check for distress: pulse > 100 AND breathing > 20
            const isDistressed = data.pulse > 100 && data.breathing > 20;
            this.onDistressDetectedCallback?.(isDistressed);
          } else if (data.type === "breathing_trace") {
            this.onBreathingTraceCallback?.(data.value);
          }
        } catch (error) {
          console.error("SmartSpectra: Failed to parse message", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("SmartSpectra: WebSocket error", error);
      };

      this.ws.onclose = () => {
        console.log("SmartSpectra: Disconnected from native helper");
        this.onDisconnectedCallback?.();
        this.ws = null;

        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            console.log("SmartSpectra: Attempting to reconnect...");
            this.connect();
          }, 3000);
        }
      };
    } catch (error) {
      console.error("SmartSpectra: Failed to create WebSocket", error);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
