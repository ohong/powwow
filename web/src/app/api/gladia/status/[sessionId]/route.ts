import { NextRequest, NextResponse } from 'next/server';
import { GLADIA_CONFIG, GladiaSessionStatus } from '@/lib/gladia-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!GLADIA_CONFIG.API_KEY) {
      return NextResponse.json(
        { error: 'Gladia API key not configured' },
        { status: 500 }
      );
    }

    // Make request to Gladia API to get session status
    const response = await fetch(`${GLADIA_CONFIG.API_URL}/live/${sessionId}`, {
      method: 'GET',
      headers: {
        'x-gladia-key': GLADIA_CONFIG.API_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Failed to get session status',
          details: errorData,
          status: response.status 
        },
        { status: response.status }
      );
    }

    const sessionStatus: GladiaSessionStatus = await response.json();

    // Return formatted session status
    return NextResponse.json({
      success: true,
      session: {
        id: sessionStatus.id,
        request_id: sessionStatus.request_id,
        status: sessionStatus.status,
        created_at: sessionStatus.created_at,
        completed_at: sessionStatus.completed_at,
        custom_metadata: sessionStatus.custom_metadata,
        error_code: sessionStatus.error_code,
        kind: sessionStatus.kind,
        result: sessionStatus.result,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting session status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
