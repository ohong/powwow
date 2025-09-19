'use client';

import { useState, useEffect } from 'react';

interface SavedTranscript {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  total_transcripts: number;
  full_text: string;
  transcripts_data: any[];
  session_duration_ms: number | null;
  user_agent: string | null;
  ip_address: string | null;
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<SavedTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<SavedTranscript | null>(null);

  // Fetch transcripts from Supabase
  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/transcripts/list');
        
        if (!response.ok) {
          throw new Error('Failed to fetch transcripts');
        }

        const data = await response.json();
        setTranscripts(data.transcripts || []);
      } catch (error) {
        console.error('Error fetching transcripts:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch transcripts');
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const exportTranscript = (transcript: SavedTranscript) => {
    const content = [
      '=== TRANSCRIPTION SESSION ===',
      `Session ID: ${transcript.session_id}`,
      `Created: ${formatDate(transcript.created_at)}`,
      `Duration: ${formatDuration(transcript.session_duration_ms)}`,
      `Total Transcripts: ${transcript.total_transcripts}`,
      '',
      '=== FULL TRANSCRIPT ===',
      '',
      ...transcript.transcripts_data.map((t, index) => `${index + 1}. [${t.timestamp}] ${t.text}`),
      '',
      '=== COMBINED TEXT ===',
      transcript.full_text,
      '',
      '=== END OF TRANSCRIPTION ==='
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${transcript.session_id.slice(0, 8)}-${transcript.created_at.slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transcripts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Saved Transcripts ({transcripts.length})
          </h1>
          <button
            onClick={() => window.location.href = '/new-page'}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Start New Transcription
          </button>
        </div>

        {transcripts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No transcripts found</h2>
            <p className="text-gray-500 mb-6">Start a new transcription session to see your transcripts here.</p>
            <button
              onClick={() => window.location.href = '/new-page'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Start Transcription
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transcript List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">All Transcripts</h2>
              {transcripts.map((transcript) => (
                <div
                  key={transcript.id}
                  className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-colors ${
                    selectedTranscript?.id === transcript.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTranscript(transcript)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">
                      Session {transcript.session_id.slice(0, 8)}...
                    </h3>
                    <span className="text-sm text-gray-500">
                      {formatDate(transcript.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {transcript.total_transcripts} transcripts • {formatDuration(transcript.session_duration_ms)}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {transcript.full_text.slice(0, 100)}...
                  </p>
                </div>
              ))}
            </div>

            {/* Transcript Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {selectedTranscript ? (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Session Details
                      </h2>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Session ID:</strong> {selectedTranscript.session_id}</p>
                        <p><strong>Created:</strong> {formatDate(selectedTranscript.created_at)}</p>
                        <p><strong>Duration:</strong> {formatDuration(selectedTranscript.session_duration_ms)}</p>
                        <p><strong>Total Transcripts:</strong> {selectedTranscript.total_transcripts}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => exportTranscript(selectedTranscript)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      Export
                    </button>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Full Transcript</h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-3">
                        {selectedTranscript.transcripts_data.map((transcript, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium text-blue-700">
                                #{index + 1}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(transcript.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-gray-900">{transcript.text}</p>
                            {transcript.confidence && (
                              <p className="text-xs text-gray-500 mt-1">
                                Confidence: {(transcript.confidence * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Combined Text</h3>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {selectedTranscript.full_text}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-4xl mb-4">👈</div>
                  <p>Select a transcript to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
