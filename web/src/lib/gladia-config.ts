// Gladia API Configuration
export const GLADIA_CONFIG = {
  API_KEY: process.env.GLADIA_API_KEY || '',
  API_URL: process.env.GLADIA_API_URL || 'https://api.gladia.io/v2',
  WS_URL: process.env.GLADIA_WS_URL || 'wss://api.gladia.io/v2',
  
  // Default audio configuration
  AUDIO: {
    ENCODING: 'wav/pcm' as const,
    BIT_DEPTH: 16,
    SAMPLE_RATE: 16000,
    CHANNELS: 1,
  },
  
  // Default transcription settings
  TRANSCRIPTION: {
    MODEL: 'solaria-1',
    ENDPOINTING: 0.05,
    MAX_DURATION_WITHOUT_ENDPOINTING: 5,
    SPEECH_THRESHOLD: 0.3, // Lower threshold for better sensitivity
  },
  
  // Message configuration
  MESSAGES: {
    RECEIVE_PARTIAL_TRANSCRIPTS: true,
    RECEIVE_FINAL_TRANSCRIPTS: true,
    RECEIVE_SPEECH_EVENTS: true,
    RECEIVE_ACKNOWLEDGMENTS: true,
    RECEIVE_ERRORS: true,
    RECEIVE_LIFECYCLE_EVENTS: false,
  }
};

// Types for Gladia API
export interface GladiaSessionInit {
  encoding: string;
  bit_depth: number;
  sample_rate: number;
  channels: number;
  custom_metadata?: Record<string, any>;
  model: string;
  endpointing: number;
  maximum_duration_without_endpointing: number;
  language_config: {
    languages: string[];
    code_switching: boolean;
  };
  pre_processing: {
    audio_enhancer: boolean;
    speech_threshold: number;
  };
  realtime_processing: {
    custom_vocabulary: boolean;
    custom_spelling: boolean;
    translation: boolean;
    named_entity_recognition: boolean;
    sentiment_analysis: boolean;
  };
  post_processing: {
    summarization: boolean;
    chapterization: boolean;
  };
  messages_config: {
    receive_partial_transcripts: boolean;
    receive_final_transcripts: boolean;
    receive_speech_events: boolean;
    receive_pre_processing_events: boolean;
    receive_realtime_processing_events: boolean;
    receive_post_processing_events: boolean;
    receive_acknowledgments: boolean;
    receive_errors: boolean;
    receive_lifecycle_events: boolean;
  };
  callback: boolean;
}

export interface GladiaSessionResponse {
  id: string;
  created_at: string;
  url: string;
}

export interface GladiaSessionStatus {
  id: string;
  request_id: string;
  version: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  created_at: string;
  completed_at: string | null;
  custom_metadata: Record<string, any> | null;
  error_code: number | null;
  kind: 'live';
  file: any;
  request_params: any;
  result: any;
}
