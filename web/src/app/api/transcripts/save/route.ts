import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, transcripts, fullText, sessionDuration } = body;

    if (!sessionId || !transcripts || !fullText) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, transcripts, fullText' },
        { status: 400 }
      );
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 
                     request.headers.get('x-real-ip') || '127.0.0.1';

    // Prepare data for Supabase
    const transcriptData = {
      session_id: sessionId,
      total_transcripts: transcripts.length,
      full_text: fullText,
      transcripts_data: transcripts,
      session_duration_ms: sessionDuration || null,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('transcripts')
      .insert([transcriptData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save transcripts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transcriptId: data.id,
      message: 'Transcripts saved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving transcripts:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
