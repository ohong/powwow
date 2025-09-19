'use client';

import { useState, useRef, useEffect } from 'react';
import { GladiaWebSocketManager, AudioProcessor } from '@/lib/gladia-websocket';

interface Transcript {
  id: string;
  text: string;
  timestamp: string;
  isPartial: boolean;
  confidence?: number;
}

export default function LiveTranscriptionPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [status, setStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsManagerRef = useRef<GladiaWebSocketManager | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);

  // Initialize WebSocket manager
  useEffect(() => {
    wsManagerRef.current = new GladiaWebSocketManager();
    audioProcessorRef.current = new AudioProcessor();

    // Set up event handlers
    wsManagerRef.current.setOnTranscript((data) => {
      console.log('Transcript received in frontend:', data);
      
      const transcript: Transcript = {
        id: data.id || crypto.randomUUID(),
        text: data.text || '',
        timestamp: data.timestamp || new Date().toISOString(),
        isPartial: data.type === 'partial_transcript' || !data.is_final,
        confidence: data.confidence,
      };
      
      console.log('Processed transcript:', transcript);
      
      // Only add transcript if it has text
      if (transcript.text && transcript.text.trim().length > 0) {
        setTranscripts(prev => {
          if (transcript.isPartial) {
            // Replace the last partial transcript
            const filtered = prev.filter(t => !t.isPartial || t.id !== transcript.id);
            return [...filtered, transcript];
          } else {
            // Add final transcript
            const filtered = prev.filter(t => !t.isPartial);
            return [...filtered, transcript];
          }
        });
      }
    });

    wsManagerRef.current.setOnError((error) => {
      console.error('WebSocket error:', error);
      setError(error.message || 'WebSocket error occurred');
    });

    wsManagerRef.current.setOnStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    wsManagerRef.current.setOnConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopRecording();
      }
    };
  }, []);

  // Start transcription session
  const startTranscription = async () => {
    try {
      setError(null);
      setIsConnecting(true);
      
      // Initiate Gladia session first
      const response = await fetch('/api/gladia/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use default configuration
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate transcription session');
      }

      const data = await response.json();
      setSessionId(data.session.id);

      // Connect to WebSocket and wait for connection
      await wsManagerRef.current!.connect(data.session.websocket_url, data.session.id);
      
      // Verify connection is established
      if (!wsManagerRef.current!.getConnectionStatus().isConnected) {
        throw new Error('Failed to establish WebSocket connection');
      }

      // Start audio recording after WebSocket is connected
      const stream = await audioProcessorRef.current!.startRecording();

      // Set up audio processing
      audioProcessorRef.current!.setAudioProcessor((audioData) => {
        try {
          wsManagerRef.current!.sendAudioChunk(audioData);
        } catch (error) {
          console.error('Error sending audio chunk:', error);
        }
      });

      setIsRecording(true);
      setIsConnecting(false);
    } catch (error) {
      console.error('Error starting transcription:', error);
      setError(error instanceof Error ? error.message : 'Failed to start transcription');
      setIsConnecting(false);
      
      // Clean up on error
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopRecording();
      }
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    }
  };

  // Stop transcription session
  const stopTranscription = () => {
    try {
      if (wsManagerRef.current) {
        wsManagerRef.current.stopRecording();
        wsManagerRef.current.disconnect();
      }
      
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopRecording();
      }

      setIsRecording(false);
      setSessionId(null);
    } catch (error) {
      console.error('Error stopping transcription:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop transcription');
    }
  };

  // Clear transcripts
  const clearTranscripts = () => {
    setTranscripts([]);
  };

  // Test function to add a dummy transcript
  const addTestTranscript = () => {
    const testTranscript: Transcript = {
      id: crypto.randomUUID(),
      text: 'This is a test transcript to verify the UI is working correctly.',
      timestamp: new Date().toISOString(),
      isPartial: false,
      confidence: 0.95,
    };
    setTranscripts(prev => [...prev, testTranscript]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Live Transcription with Gladia
        </h1>

        {/* Status Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-600">Connection:</span>
              <div className={`inline-block ml-2 w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="ml-2 text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <span className="ml-2 text-sm font-medium capitalize">{status}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Recording:</span>
              <span className="ml-2 text-sm font-medium">
                {isConnecting ? 'Connecting...' : isRecording ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Session ID:</span>
              <span className="ml-2 text-sm font-mono text-xs">
                {sessionId ? sessionId.slice(0, 8) + '...' : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="flex space-x-4">
            <button
              onClick={startTranscription}
              disabled={isRecording || isConnected || isConnecting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Start Transcription'}
            </button>
            <button
              onClick={stopTranscription}
              disabled={!isRecording}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Stop Transcription
            </button>
            <button
              onClick={clearTranscripts}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Clear Transcripts
            </button>
            <button
              onClick={addTestTranscript}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Test UI
            </button>
          </div>
        </div>

        {/* Transcripts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Live Transcripts ({transcripts.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transcripts.length === 0 ? (
              <p className="text-gray-500 italic">No transcripts yet. Start recording to see live transcription.</p>
            ) : (
              transcripts.map((transcript) => (
                <div
                  key={transcript.id}
                  className={`p-3 rounded-lg border ${
                    transcript.isPartial
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-medium ${
                      transcript.isPartial ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {transcript.isPartial ? 'Partial' : 'Final'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(transcript.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-900">{transcript.text}</p>
                  {transcript.confidence && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">
                        Confidence: {(transcript.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
