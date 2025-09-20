// Session management and error handling for Gladia live transcription
export interface SessionState {
  id: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'recording' | 'disconnecting' | 'error';
  error: string | null;
  startTime: Date | null;
  endTime: Date | null;
  transcriptCount: number;
  lastActivity: Date | null;
}

export interface SessionConfig {
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  sessionTimeout: number;
  heartbeatInterval: number;
}

export class SessionManager {
  private state: SessionState = {
    id: null,
    status: 'idle',
    error: null,
    startTime: null,
    endTime: null,
    transcriptCount: 0,
    lastActivity: null,
  };

  private config: SessionConfig = {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    sessionTimeout: 300000, // 5 minutes
    heartbeatInterval: 30000, // 30 seconds
  };

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  // Event handlers
  private onStateChange: ((state: SessionState) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private onSessionTimeout: (() => void) | null = null;

  constructor(config?: Partial<SessionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Set event handlers
  setOnStateChange(handler: (state: SessionState) => void) {
    this.onStateChange = handler;
  }

  setOnError(handler: (error: Error) => void) {
    this.onError = handler;
  }

  setOnSessionTimeout(handler: () => void) {
    this.onSessionTimeout = handler;
  }

  // Update session state
  private updateState(updates: Partial<SessionState>) {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this.state);
  }

  // Start session
  startSession(sessionId: string) {
    this.updateState({
      id: sessionId,
      status: 'connecting',
      error: null,
      startTime: new Date(),
      endTime: null,
      transcriptCount: 0,
      lastActivity: new Date(),
    });

    this.startHeartbeat();
    this.startSessionTimer();
  }

  // Mark session as connected
  markConnected() {
    this.updateState({
      status: 'connected',
      lastActivity: new Date(),
    });
    this.reconnectAttempts = 0;
  }

  // Mark session as recording
  markRecording() {
    this.updateState({
      status: 'recording',
      lastActivity: new Date(),
    });
  }

  // Mark session as disconnected
  markDisconnected() {
    this.updateState({
      status: 'disconnecting',
      endTime: new Date(),
    });

    this.stopHeartbeat();
    this.stopSessionTimer();

    // Attempt reconnection if configured
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.updateState({ status: 'idle' });
    }
  }

  // Handle error
  handleError(error: Error | string) {
    const errorMessage = error instanceof Error ? error.message : error;
    this.updateState({
      status: 'error',
      error: errorMessage,
      lastActivity: new Date(),
    });

    this.onError?.(error instanceof Error ? error : new Error(errorMessage));
  }

  // Update transcript count
  updateTranscriptCount() {
    this.updateState({
      transcriptCount: this.state.transcriptCount + 1,
      lastActivity: new Date(),
    });
  }

  // Start heartbeat
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.updateState({
        lastActivity: new Date(),
      });
    }, this.config.heartbeatInterval);
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Start session timer
  private startSessionTimer() {
    this.sessionTimer = setTimeout(() => {
      this.onSessionTimeout?.();
      this.handleError(new Error('Session timeout'));
    }, this.config.sessionTimeout);
  }

  // Stop session timer
  private stopSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  // Schedule reconnection
  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      this.updateState({
        status: 'connecting',
        error: `Reconnecting... (attempt ${this.reconnectAttempts})`,
      });
    }, delay);
  }

  // Stop reconnection
  private stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // End session
  endSession() {
    this.updateState({
      status: 'idle',
      id: null,
      error: null,
      endTime: new Date(),
    });

    this.stopHeartbeat();
    this.stopSessionTimer();
    this.stopReconnect();
    this.reconnectAttempts = 0;
  }

  // Get current state
  getState(): SessionState {
    return { ...this.state };
  }

  // Get session duration
  getSessionDuration(): number | null {
    if (!this.state.startTime) return null;
    
    const endTime = this.state.endTime || new Date();
    return endTime.getTime() - this.state.startTime.getTime();
  }

  // Check if session is active
  isActive(): boolean {
    return ['connecting', 'connected', 'recording'].includes(this.state.status);
  }

  // Check if session has error
  hasError(): boolean {
    return this.state.status === 'error' || this.state.error !== null;
  }

  // Get session statistics
  getSessionStats() {
    return {
      duration: this.getSessionDuration(),
      transcriptCount: this.state.transcriptCount,
      reconnectAttempts: this.reconnectAttempts,
      lastActivity: this.state.lastActivity,
      status: this.state.status,
    };
  }

  // Cleanup
  destroy() {
    this.endSession();
    this.onStateChange = null;
    this.onError = null;
    this.onSessionTimeout = null;
  }
}

// Error types for better error handling
export enum GladiaErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SESSION_ERROR = 'SESSION_ERROR',
  AUDIO_ERROR = 'AUDIO_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class GladiaError extends Error {
  public readonly type: GladiaErrorType;
  public readonly code?: string | number;
  public readonly details?: any;

  constructor(
    message: string,
    type: GladiaErrorType = GladiaErrorType.UNKNOWN_ERROR,
    code?: string | number,
    details?: any
  ) {
    super(message);
    this.name = 'GladiaError';
    this.type = type;
    this.code = code;
    this.details = details;
  }

  static fromResponse(response: Response, details?: any): GladiaError {
    const type = response.status === 401 ? GladiaErrorType.AUTHENTICATION_ERROR :
                 response.status >= 500 ? GladiaErrorType.API_ERROR :
                 GladiaErrorType.API_ERROR;

    return new GladiaError(
      `API request failed with status ${response.status}`,
      type,
      response.status,
      details
    );
  }

  static fromWebSocket(event: Event): GladiaError {
    return new GladiaError(
      'WebSocket connection error',
      GladiaErrorType.WEBSOCKET_ERROR,
      undefined,
      event
    );
  }

  static fromAudio(error: Error): GladiaError {
    return new GladiaError(
      `Audio processing error: ${error.message}`,
      GladiaErrorType.AUDIO_ERROR,
      undefined,
      error
    );
  }
}

// Utility functions for error handling
export const ErrorHandler = {
  // Log error with context
  logError(error: Error, context?: string) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    console.error(`[${timestamp}]${contextStr}`, error);
  },

  // Format error for display
  formatError(error: Error): string {
    if (error instanceof GladiaError) {
      switch (error.type) {
        case GladiaErrorType.NETWORK_ERROR:
          return 'Network connection failed. Please check your internet connection.';
        case GladiaErrorType.AUTHENTICATION_ERROR:
          return 'Authentication failed. Please check your API key.';
        case GladiaErrorType.SESSION_ERROR:
          return 'Session error occurred. Please try starting a new session.';
        case GladiaErrorType.AUDIO_ERROR:
          return 'Audio processing error. Please check your microphone permissions.';
        case GladiaErrorType.WEBSOCKET_ERROR:
          return 'Connection lost. Attempting to reconnect...';
        case GladiaErrorType.API_ERROR:
          return `API error: ${error.message}`;
        case GladiaErrorType.TIMEOUT_ERROR:
          return 'Request timed out. Please try again.';
        default:
          return error.message;
      }
    }
    return error.message;
  },

  // Check if error is recoverable
  isRecoverable(error: Error): boolean {
    if (error instanceof GladiaError) {
      return [
        GladiaErrorType.NETWORK_ERROR,
        GladiaErrorType.WEBSOCKET_ERROR,
        GladiaErrorType.TIMEOUT_ERROR,
      ].includes(error.type);
    }
    return false;
  },
};
