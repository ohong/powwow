import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabaseUrl = 'https://owdoutfijwluujvxzgmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZG91dGZpandsdXVqdnh6Z21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTQ3NDEsImV4cCI6MjA3Mzg5MDc0MX0.KO6t7hNqHm9R3puysF4BRf82NNCVq4WIJSkEmyOPrMk';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Extract conferenceId and userProfile from the request body
    const { conferenceId, userProfile } = body;
    
    // Console log the received data
    console.log('=== Personalized Schedule API ===');
    console.log('Conference ID:', conferenceId);
    console.log('User Profile:', userProfile);
    console.log('Full request body:', body);
    console.log('================================');
    
    // Validate conferenceId parameter
    if (!conferenceId || conferenceId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Conference ID is required'
      }, { status: 400 });
    }
    
    // Fetch conference data from database
    console.log('Fetching conference data from database...');
    const { data: conference, error: dbError } = await supabase
      .from('conferences')
      .select('*')
      .eq('conferenceid', conferenceId)
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      
      if (dbError.code === 'PGRST116') {
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
    
    console.log('Conference data fetched successfully:', {
      conferenceId: conference.conferenceid,
      url: conference.url,
      contentLength: conference.markdown_content?.length || 0
    });
    
    // Construct a prompt for the OpenAI API with conference data
    const prompt = `Generate a personalized schedule based on the following information:

<USER_PREFERENCES>
${userProfile}
</USER_PREFERENCES>


<CONFERENCE_DATA>
${conference.markdown_content}
</CONFERENCE_DATA>

Please analyze the conference content and user profile to generate a detailed, personalized schedule with:
Make it short and give only event and their time. Nothing extra
`;
    
    console.log('Calling OpenAI Completions API with conference data...');
    
    // Call the OpenAI Responses API
    const result = await openai.responses.create({
      model: "gpt-5",
      input: prompt,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });
    
    // Extract the generated text
    const generatedSchedule = result.output_text;
    
    console.log('OpenAI API response received:', generatedSchedule);
    
    // Return the generated schedule
    return NextResponse.json({
      success: true,
      message: 'Schedule generated successfully',
      conferenceId: conferenceId,
      conferenceUrl: conference.url,
      userProfile: userProfile,
      schedule: generatedSchedule
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in personalized schedule API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process schedule request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
