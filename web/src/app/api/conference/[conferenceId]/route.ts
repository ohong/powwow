import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://owdoutfijwluujvxzgmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZG91dGZpandsdXVqdnh6Z21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTQ3NDEsImV4cCI6MjA3Mzg5MDc0MX0.KO6t7hNqHm9R3puysF4BRf82NNCVq4WIJSkEmyOPrMk';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { conferenceId: string } }
) {
  try {
    const { conferenceId } = params;

    // Validate conferenceId parameter
    if (!conferenceId || conferenceId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Conference ID is required'
      }, { status: 400 });
    }

    console.log('Fetching conference with ID:', conferenceId);

    // Query the database
    const { data: conference, error } = await supabase
      .from('conferences')
      .select('*')
      .eq('conferenceid', conferenceId)
      .single();

    if (error) {
      console.error('Database error:', error);
      
      // Handle specific error cases
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Conference not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch conference data'
      }, { status: 500 });
    }

    if (!conference) {
      return NextResponse.json({
        success: false,
        error: 'Conference not found'
      }, { status: 404 });
    }

    console.log('Conference found:', conference.conferenceid);

    // Return the conference data
    return NextResponse.json({
      success: true,
      data: {
        conferenceId: conference.conferenceid,
        url: conference.url,
        markdownContent: conference.markdown_content,
        createdAt: conference.created_at,
        updatedAt: conference.updated_at
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
