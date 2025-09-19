import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://owdoutfijwluujvxzgmm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZG91dGZpandsdXVqdnh6Z21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTQ3NDEsImV4cCI6MjA3Mzg5MDc0MX0.KO6t7hNqHm9R3puysF4BRf82NNCVq4WIJSkEmyOPrMk';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters from the request
    const { searchParams } = new URL(request.url);
    
    // Extract the target URL parameter
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required'
      }, { status: 400 });
    }
    
    // Call Bright Data Web Unlocker API with markdown format
    const apiKey = '60621ac6b8e00d4cfcaa011add777d456bde7699d9d8a6d7a8ffe057eedf150d';
    const zone = 'scraping_browser1';
    
    console.log('Calling Bright Data Web Unlocker API with markdown format...');
    console.log('Target URL:', targetUrl);
    console.log('Zone:', zone);
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        zone: zone,
        format: 'raw',
        data_format: 'markdown'
      })
    };

    let externalData;
    try {
      const externalResponse = await fetch('https://api.brightdata.com/request', options);
      console.log('External API status:', externalResponse.status);
      console.log('External API headers:', Object.fromEntries(externalResponse.headers.entries()));
      
      const responseText = await externalResponse.text();
      console.log('External API raw response length:', responseText.length);
      console.log('External API raw response preview:', responseText.substring(0, 500) + '...');
      
      // Check if response seems truncated
      const isLikelyTruncated = responseText.length > 0 && (
        responseText.endsWith('...') || 
        responseText.endsWith('[truncated]') ||
        responseText.endsWith('[cut off]') ||
        !responseText.endsWith('\n') && responseText.length > 1000
      );
      
      if (isLikelyTruncated) {
        console.warn('Response appears to be truncated. Length:', responseText.length);
      }
      
      // Since we're requesting markdown format, the response should be markdown text
      externalData = {
        markdownContent: responseText,
        status: externalResponse.status,
        success: externalResponse.ok,
        isTruncated: isLikelyTruncated,
        contentLength: responseText.length
      };
      
      console.log('External API response processed successfully');
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      externalData = { 
        error: 'Failed to fetch data', 
        details: fetchError.message,
        success: false
      };
    }
    
    // Extract the URL from the request
    const conferenceUrl = targetUrl;
    
    // Generate a unique conference ID
    const conferenceId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log content length instead of full content to avoid console truncation
    console.log('Markdown content length:', externalData.markdownContent?.length || 0);
    console.log('Content preview (first 200 chars):', externalData.markdownContent?.substring(0, 200) + '...');
    
    console.log('length of the content: ', externalData.markdownContent?.length);
    console.log('length of the content: ', externalData.markdownContent?.length);
    
    // Save to Supabase
    const { data: conferenceData, error: supabaseError } = await supabase
      .from('conferences')
      .insert({
        conferenceid: conferenceId,
        url: conferenceUrl,
        markdown_content: externalData.markdownContent || JSON.stringify(externalData)
      })
      .select('conferenceid')
      .single();
    
    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save conference data'
      }, { status: 500 });
    }
    
    console.log('Conference saved with ID:', conferenceData.conferenceid);
    
    // Return standard API response with conference ID and content info
    return NextResponse.json({
      success: true,
      data: {
        conferenceId: conferenceData.conferenceid,
        contentLength: externalData.contentLength || 0,
        isTruncated: externalData.isTruncated || false,
        url: conferenceUrl
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json({
      error: 'Something went wrong',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get URL parameters from the request
    const { searchParams } = new URL(request.url);
    
    // Extract the target URL parameter
    const targetUrl = searchParams.get('url');
    
    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required'
      }, { status: 400 });
    }
    
    // Call Bright Data Web Unlocker API with markdown format
    const apiKey = '60621ac6b8e00d4cfcaa011add777d456bde7699d9d8a6d7a8ffe057eedf150d';
    const zone = 'scraping_browser1';
    
    console.log('Calling Bright Data Web Unlocker API with markdown format...');
    console.log('Target URL:', targetUrl);
    console.log('Zone:', zone);
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        zone: zone,
        format: 'raw',
        data_format: 'markdown'
      })
    };

    let externalData;
    try {
      const externalResponse = await fetch('https://api.brightdata.com/request', options);
      console.log('External API status:', externalResponse.status);
      console.log('External API headers:', Object.fromEntries(externalResponse.headers.entries()));
      
      const responseText = await externalResponse.text();
      console.log('External API raw response length:', responseText.length);
      console.log('External API raw response preview:', responseText.substring(0, 500) + '...');
      
      // Check if response seems truncated
      const isLikelyTruncated = responseText.length > 0 && (
        responseText.endsWith('...') || 
        responseText.endsWith('[truncated]') ||
        responseText.endsWith('[cut off]') ||
        !responseText.endsWith('\n') && responseText.length > 1000
      );
      
      if (isLikelyTruncated) {
        console.warn('Response appears to be truncated. Length:', responseText.length);
      }
      
      // Since we're requesting markdown format, the response should be markdown text
      externalData = {
        markdownContent: responseText,
        status: externalResponse.status,
        success: externalResponse.ok,
        isTruncated: isLikelyTruncated,
        contentLength: responseText.length
      };
      
      console.log('External API response processed successfully');
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      externalData = { 
        error: 'Failed to fetch data', 
        details: fetchError.message,
        success: false
      };
    }
    
    // Extract the URL from the request
    const conferenceUrl = targetUrl;
    
    // Generate a unique conference ID
    const conferenceId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log content length instead of full content to avoid console truncation
    console.log('Markdown content length:', externalData.markdownContent?.length || 0);
    console.log('Content preview (first 200 chars):', externalData.markdownContent?.substring(0, 200) + '...');
    
    // Save to Supabase
    const { data: conferenceData, error: supabaseError } = await supabase
      .from('conferences')
      .insert({
        conferenceid: conferenceId,
        url: conferenceUrl,
        markdown_content: externalData.markdownContent || JSON.stringify(externalData)
      })
      .select('conferenceid')
      .single();
    
    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save conference data'
      }, { status: 500 });
    }
    
    console.log('Conference saved with ID:', conferenceData.conferenceid);
    
    // Return standard API response with conference ID and content info
    return NextResponse.json({
      success: true,
      data: {
        conferenceId: conferenceData.conferenceid,
        contentLength: externalData.contentLength || 0,
        isTruncated: externalData.isTruncated || false,
        url: conferenceUrl
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json({
      error: 'Something went wrong',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
