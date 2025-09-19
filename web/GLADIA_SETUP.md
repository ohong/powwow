# Gladia Live Transcription Integration

This project implements a robust live transcription system using the [Gladia API](https://docs.gladia.io/api-reference/v2/live/init). The system provides real-time speech-to-text transcription with WebSocket connectivity, audio processing, and comprehensive error handling.

## Features

- ✅ **Real-time Live Transcription** - Stream audio and receive live transcripts
- ✅ **WebSocket Connection Management** - Robust connection handling with auto-reconnection
- ✅ **Audio Processing** - Browser-based audio capture and processing
- ✅ **Session Management** - Complete session lifecycle management
- ✅ **Error Handling** - Comprehensive error handling and recovery
- ✅ **Modern UI** - Clean, responsive interface with real-time updates
- ✅ **TypeScript Support** - Full type safety throughout the application

## Architecture

### Backend (Next.js API Routes)
- `/api/gladia/initiate` - Initialize new transcription sessions
- `/api/gladia/status/[sessionId]` - Monitor session status and retrieve results

### Frontend (React Components)
- Live transcription interface with real-time transcript display
- Audio capture and processing using Web Audio API
- WebSocket connection management for real-time communication

### Core Libraries
- `gladia-config.ts` - Configuration management and API types
- `gladia-websocket.ts` - WebSocket connection and audio processing
- `session-manager.ts` - Session lifecycle and error handling

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in your project root:

```bash
# Gladia API Configuration
GLADIA_API_KEY=your_gladia_api_key_here
GLADIA_API_URL=https://api.gladia.io/v2
GLADIA_WS_URL=wss://api.gladia.io/v2

# Audio Configuration (Optional - defaults provided)
AUDIO_SAMPLE_RATE=16000
AUDIO_BIT_DEPTH=16
AUDIO_CHANNELS=1
AUDIO_ENCODING=wav/pcm
```

### 2. Get Gladia API Key

1. Sign up at [Gladia.io](https://gladia.io)
2. Navigate to your dashboard
3. Generate an API key
4. Add the key to your `.env.local` file

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

### 5. Access the Application

Navigate to `http://localhost:3000/new-page` to access the live transcription interface.

## Usage

### Starting a Transcription Session

1. Click "Start Transcription" button
2. Grant microphone permissions when prompted
3. Begin speaking - you'll see real-time transcripts appear
4. Partial transcripts (yellow) update in real-time
5. Final transcripts (green) are confirmed segments

### Session Management

- **Connection Status**: Monitor WebSocket connection status
- **Session ID**: Track your current session
- **Error Handling**: Automatic error display and recovery
- **Auto-reconnection**: Automatic reconnection on connection loss

### Audio Configuration

The system uses optimal settings for speech recognition:
- **Sample Rate**: 16kHz (optimal for speech)
- **Bit Depth**: 16-bit
- **Channels**: Mono (1 channel)
- **Format**: PCM/WAV

## API Endpoints

### POST `/api/gladia/initiate`

Initialize a new live transcription session.

**Request Body:**
```json
{
  "encoding": "wav/pcm",
  "bit_depth": 16,
  "sample_rate": 16000,
  "channels": 1,
  "model": "solaria-1",
  "endpointing": 0.05,
  "maximum_duration_without_endpointing": 5,
  "language_config": {
    "languages": [],
    "code_switching": false
  },
  "pre_processing": {
    "audio_enhancer": false,
    "speech_threshold": 0.6
  },
  "realtime_processing": {
    "custom_vocabulary": false,
    "custom_spelling": false,
    "translation": false,
    "named_entity_recognition": false,
    "sentiment_analysis": false
  },
  "post_processing": {
    "summarization": false,
    "chapterization": false
  },
  "messages_config": {
    "receive_partial_transcripts": true,
    "receive_final_transcripts": true,
    "receive_speech_events": true,
    "receive_acknowledgments": true,
    "receive_errors": true,
    "receive_lifecycle_events": false
  },
  "callback": false
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "45463597-20b7-4af7-b3b3-f5fb778203ab",
    "created_at": "2023-12-28T09:04:17.210Z",
    "websocket_url": "wss://api.gladia.io/v2/live?token=..."
  },
  "config": { /* session configuration */ }
}
```

### GET `/api/gladia/status/[sessionId]`

Get the status and results of a transcription session.

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "45463597-20b7-4af7-b3b3-f5fb778203ab",
    "request_id": "G-45463597",
    "status": "processing",
    "created_at": "2023-12-28T09:04:17.210Z",
    "completed_at": null,
    "custom_metadata": { "user": "anonymous" },
    "error_code": null,
    "kind": "live",
    "result": null
  }
}
```

## WebSocket Communication

### Audio Streaming

Audio data is streamed to Gladia in real-time using WebSocket binary messages:

```typescript
// Send audio chunk
websocket.send(audioBuffer);
```

### Message Types

The system handles various message types from Gladia:

- `partial_transcript` - Real-time partial transcription
- `final_transcript` - Confirmed final transcription
- `speech_event` - Speech detection events
- `acknowledgment` - Message acknowledgments
- `error` - Error messages
- `lifecycle` - Session lifecycle events

## Error Handling

The system includes comprehensive error handling:

### Error Types
- `NETWORK_ERROR` - Network connectivity issues
- `AUTHENTICATION_ERROR` - API key or authentication problems
- `SESSION_ERROR` - Session management errors
- `AUDIO_ERROR` - Audio capture or processing errors
- `WEBSOCKET_ERROR` - WebSocket connection issues
- `API_ERROR` - Gladia API errors
- `TIMEOUT_ERROR` - Request timeouts

### Recovery Mechanisms
- Automatic reconnection on connection loss
- Session timeout handling
- Graceful error display and user feedback
- Retry logic for failed operations

## Configuration Options

### Audio Settings
```typescript
const audioConfig = {
  sampleRate: 16000,    // 8kHz, 16kHz, 32kHz, 44.1kHz, 48kHz
  bitDepth: 16,         // 8, 16, 24, 32 bits
  channels: 1,          // 1-8 channels
  encoding: 'wav/pcm'   // wav/pcm, wav/alaw, wav/ulaw
};
```

### Transcription Settings
```typescript
const transcriptionConfig = {
  model: 'solaria-1',
  endpointing: 0.05,                    // 0.01-10 seconds
  maxDurationWithoutEndpointing: 5,     // 5-60 seconds
  speechThreshold: 0.6,                 // 0.0-1.0
  languages: [],                        // Auto-detect if empty
  codeSwitching: false,
  audioEnhancer: false,
  customVocabulary: false,
  translation: false,
  summarization: false
};
```

## Browser Compatibility

### Required APIs
- **Web Audio API** - For audio processing
- **MediaDevices API** - For microphone access
- **WebSocket API** - For real-time communication
- **MediaRecorder API** - For audio capture (fallback)

### Supported Browsers
- Chrome 66+
- Firefox 60+
- Safari 14.1+
- Edge 79+

### HTTPS Requirement
Microphone access requires HTTPS in production. Use `https://localhost` for local development or deploy to a secure domain.

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Ensure HTTPS is enabled
   - Check browser permissions
   - Try refreshing the page

2. **WebSocket Connection Failed**
   - Verify API key is correct
   - Check network connectivity
   - Ensure firewall allows WebSocket connections

3. **No Audio Input**
   - Check microphone is connected and working
   - Verify browser audio permissions
   - Test with other applications

4. **Poor Transcription Quality**
   - Speak clearly and at normal volume
   - Reduce background noise
   - Check microphone quality
   - Adjust speech threshold if needed

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('gladia-debug', 'true');
```

## Security Considerations

- API keys are stored server-side only
- WebSocket connections use temporary tokens
- Audio data is processed in real-time (not stored)
- HTTPS required for microphone access
- No persistent audio storage

## Performance Optimization

- Audio chunks are optimized for low latency (100-200ms)
- WebSocket messages are batched when possible
- Memory usage is monitored and cleaned up
- Connection pooling for multiple sessions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues related to:
- **Gladia API**: Contact [Gladia Support](https://docs.gladia.io)
- **This Implementation**: Create an issue in this repository
- **Browser Compatibility**: Check browser documentation

## Changelog

### v1.0.0
- Initial implementation
- Live transcription with WebSocket
- Audio processing and capture
- Session management
- Error handling and recovery
- Modern UI with real-time updates
