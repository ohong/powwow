import { NextRequest, NextResponse } from 'next/server';
import { GLADIA_CONFIG, GladiaSessionInit, GladiaSessionResponse } from '@/lib/gladia-config';

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!GLADIA_CONFIG.API_KEY) {
      return NextResponse.json(
        { error: 'Gladia API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body for custom configuration
    const body = await request.json().catch(() => ({}));
    
    // Build the session initiation payload
    const sessionConfig: GladiaSessionInit = {
      encoding: body.encoding || GLADIA_CONFIG.AUDIO.ENCODING,
      bit_depth: body.bit_depth || GLADIA_CONFIG.AUDIO.BIT_DEPTH,
      sample_rate: body.sample_rate || GLADIA_CONFIG.AUDIO.SAMPLE_RATE,
      channels: body.channels || GLADIA_CONFIG.AUDIO.CHANNELS,
      custom_metadata: body.custom_metadata || {
        user: 'anonymous',
        timestamp: new Date().toISOString(),
        session_id: crypto.randomUUID()
      },
      model: body.model || GLADIA_CONFIG.TRANSCRIPTION.MODEL,
      endpointing: body.endpointing || GLADIA_CONFIG.TRANSCRIPTION.ENDPOINTING,
      maximum_duration_without_endpointing: body.maximum_duration_without_endpointing || GLADIA_CONFIG.TRANSCRIPTION.MAX_DURATION_WITHOUT_ENDPOINTING,
      language_config: {
        languages: body.languages || [],
        code_switching: body.code_switching || false,
      },
      pre_processing: {
        audio_enhancer: body.audio_enhancer || false,
        speech_threshold: body.speech_threshold || GLADIA_CONFIG.TRANSCRIPTION.SPEECH_THRESHOLD,
      },
      realtime_processing: {
        custom_vocabulary: body.custom_vocabulary || false,
        custom_spelling: body.custom_spelling || false,
        translation: body.translation || false,
        named_entity_recognition: body.named_entity_recognition || false,
        sentiment_analysis: body.sentiment_analysis || false,
      },
      post_processing: {
        summarization: body.summarization || false,
        chapterization: body.chapterization || false,
      },
      messages_config: {
        receive_partial_transcripts: body.receive_partial_transcripts ?? GLADIA_CONFIG.MESSAGES.RECEIVE_PARTIAL_TRANSCRIPTS,
        receive_final_transcripts: body.receive_final_transcripts ?? GLADIA_CONFIG.MESSAGES.RECEIVE_FINAL_TRANSCRIPTS,
        receive_speech_events: body.receive_speech_events ?? GLADIA_CONFIG.MESSAGES.RECEIVE_SPEECH_EVENTS,
        receive_pre_processing_events: body.receive_pre_processing_events ?? true,
        receive_realtime_processing_events: body.receive_realtime_processing_events ?? true,
        receive_post_processing_events: body.receive_post_processing_events ?? true,
        receive_acknowledgments: body.receive_acknowledgments ?? GLADIA_CONFIG.MESSAGES.RECEIVE_ACKNOWLEDGMENTS,
        receive_errors: body.receive_errors ?? GLADIA_CONFIG.MESSAGES.RECEIVE_ERRORS,
        receive_lifecycle_events: body.receive_lifecycle_events ?? GLADIA_CONFIG.MESSAGES.RECEIVE_LIFECYCLE_EVENTS,
      },
      callback: body.callback || false,
    };

    // Log the configuration being sent
    console.log('Sending Gladia session config:', JSON.stringify(sessionConfig, null, 2));

    // Make request to Gladia API
    const response = await fetch(`${GLADIA_CONFIG.API_URL}/live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gladia-key': GLADIA_CONFIG.API_KEY,
      },
      body: JSON.stringify(sessionConfig),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Failed to initiate Gladia session',
          details: errorData,
          status: response.status 
        },
        { status: response.status }
      );
    }

    const sessionData: GladiaSessionResponse = await response.json();

    // Return session information
    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id,
        created_at: sessionData.created_at,
        websocket_url: sessionData.url,
      },
      config: sessionConfig,
    }, { status: 200 });

  } catch (error) {
    console.error('Error initiating Gladia session:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
