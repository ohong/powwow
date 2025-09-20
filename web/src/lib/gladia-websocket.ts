// WebSocket connection handler for Gladia live transcription
export class GladiaWebSocketManager {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isConnected = false;

  // Event handlers
  private onTranscript: ((transcript: any) => void) | null = null;
  private onError: ((error: any) => void) | null = null;
  private onStatusChange: ((status: string) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  // Set event handlers
  setOnTranscript(handler: (transcript: any) => void) {
    this.onTranscript = handler;
  }

  setOnError(handler: (error: any) => void) {
    this.onError = handler;
  }

  setOnStatusChange(handler: (status: string) => void) {
    this.onStatusChange = handler;
  }

  setOnConnectionChange(handler: (connected: boolean) => void) {
    this.onConnectionChange = handler;
  }

  // Connect to Gladia WebSocket
  async connect(websocketUrl: string, sessionId: string): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      throw new Error('Already connecting or connected');
    }

    this.isConnecting = true;
    this.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(websocketUrl);
        
        this.ws.onopen = () => {
          console.log('Connected to Gladia WebSocket');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.onConnectionChange?.(true);
          this.onStatusChange?.('connected');
          resolve(); // Resolve the promise when connected
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          this.onError?.(error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed during connection:', event.code, event.reason);
          this.isConnecting = false;
          if (event.code !== 1000) {
            reject(new Error(`WebSocket connection closed: ${event.reason || 'Unknown error'}`));
          }
        };

        this.ws.onmessage = this.handleMessage;

        // Set up error and close handlers after connection
        const originalOnError = this.ws.onerror;
        const originalOnClose = this.ws.onclose;

        this.ws.onerror = (error) => {
          originalOnError?.(error);
          this.handleError(error);
        };

        this.ws.onclose = (event) => {
          originalOnClose?.(event);
          this.handleClose(event);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Send audio chunk to Gladia
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, skipping audio chunk');
      return; // Don't throw error, just skip the chunk
    }

    try {
      console.log(`Sending audio chunk: ${audioData.byteLength} bytes`);
      
      // Convert ArrayBuffer to base64
      const uint8Array = new Uint8Array(audioData);
      const base64String = btoa(String.fromCharCode(...uint8Array));
      
      // Send as JSON with base64 encoded audio
      const message = {
        type: 'audio_chunk',
        data: {
          chunk: base64String
        }
      };
      
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      this.onError?.(error);
    }
  }

  // Send stop recording command
  stopRecording(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    try {
      this.ws.send(JSON.stringify({ action: 'stop_recording' }));
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.onError?.(error);
    }
  }

  // Handle incoming messages
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);
      
      switch (data.type) {
        case 'transcript':
          console.log('Received transcript:', data);
          // Gladia transcript format: data.utterance.text
          if (data.data && data.data.utterance && data.data.utterance.text) {
            this.onTranscript?.({
              type: data.data.is_final ? 'final_transcript' : 'partial_transcript',
              text: data.data.utterance.text,
              id: data.data.id,
              confidence: data.data.utterance.confidence,
              is_final: data.data.is_final,
              timestamp: data.created_at
            });
          }
          break;
        case 'post_transcript':
          console.log('Received post transcript:', data);
          if (data.data && data.data.utterance && data.data.utterance.text) {
            this.onTranscript?.({
              type: 'final_transcript',
              text: data.data.utterance.text,
              id: data.data.id,
              confidence: data.data.utterance.confidence,
              is_final: true,
              timestamp: data.created_at
            });
          }
          break;
        case 'post_final_transcript':
          console.log('Received post final transcript:', data);
          if (data.data && data.data.utterance && data.data.utterance.text) {
            this.onTranscript?.({
              type: 'final_transcript',
              text: data.data.utterance.text,
              id: data.data.id,
              confidence: data.data.utterance.confidence,
              is_final: true,
              timestamp: data.created_at
            });
          }
          break;
        case 'speech_start':
          console.log('Speech started:', data);
          break;
        case 'speech_end':
          console.log('Speech ended:', data);
          break;
        case 'start_recording':
          console.log('Recording started:', data);
          break;
        case 'start_session':
          console.log('Session started:', data);
          break;
        case 'end_recording':
          console.log('Recording ended:', data);
          break;
        case 'end_session':
          console.log('Session ended:', data);
          break;
        case 'acknowledgment':
          console.log('Received acknowledgment:', data);
          break;
        case 'audio_chunk':
          // This is an acknowledgment that our audio chunk was received
          console.log('Audio chunk acknowledged:', data);
          break;
        case 'error':
          console.error('Received error:', data);
          this.onError?.(data);
          break;
        default:
          console.log('Unknown message type:', data.type, data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.onError?.(error);
    }
  }

  // Handle WebSocket errors
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.onError?.(event);
  }

  // Handle WebSocket close
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.onConnectionChange?.(false);
    this.onStatusChange?.('disconnected');

    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  // Attempt to reconnect
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.sessionId && !this.isConnected) {
        // Note: In a real implementation, you'd need to get a fresh WebSocket URL
        // For now, we'll just log the attempt
        console.log('Reconnection attempt would go here');
        this.onStatusChange?.('reconnecting');
      }
    }, delay);
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.sessionId = null;
    this.onConnectionChange?.(false);
    this.onStatusChange?.('disconnected');
  }

  // Get connection status
  getConnectionStatus(): {
    isConnected: boolean;
    isConnecting: boolean;
    sessionId: string | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Audio processing utilities
export class AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  // Audio configuration
  private readonly SAMPLE_RATE = 16000;
  private readonly CHANNELS = 1;
  private readonly BIT_DEPTH = 16;

  // Start audio capture
  async startRecording(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: this.CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create a processor to handle audio chunks
      this.processor = this.audioContext.createScriptProcessor(4096, this.CHANNELS, this.CHANNELS);
      
      return this.stream;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  // Process audio data
  setAudioProcessor(onAudioData: (audioData: ArrayBuffer) => void): void {
    if (!this.processor) {
      throw new Error('Audio processor not initialized');
    }

    this.processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const audioData = inputBuffer.getChannelData(0);
      
      // Check if there's actual audio data
      const hasAudio = audioData.some(sample => Math.abs(sample) > 0.01);
      const maxAmplitude = Math.max(...audioData.map(sample => Math.abs(sample)));
      
      if (hasAudio) {
        console.log(`Audio detected - Max amplitude: ${maxAmplitude.toFixed(4)}, Processing chunk...`);
      }
      
      // Convert float32 to int16
      const int16Array = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        int16Array[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
      }
      
      onAudioData(int16Array.buffer);
    };

    this.source?.connect(this.processor);
    this.processor.connect(this.audioContext!.destination);
  }

  // Stop audio capture
  stopRecording(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // Get audio configuration
  getAudioConfig() {
    return {
      sampleRate: this.SAMPLE_RATE,
      channels: this.CHANNELS,
      bitDepth: this.BIT_DEPTH,
      encoding: 'wav/pcm'
    };
  }
}
