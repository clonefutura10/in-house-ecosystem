/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/ats/llamaparse'
import { extractResumeData } from '@/lib/ats/scoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Allow 2 minutes for parsing

interface ParseRequest {
  resumeId: string
}

/**
 * POST /api/ats/parse
 * Parse a resume using LlamaParse and extract structured data
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body: ParseRequest = await req.json()
    const { resumeId } = body

    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 })
    }

    // Get resume record
    const { data: resume, error: resumeError } = await supabase
      .from('ats_resumes')
      .select('*')
      .eq('id', resumeId)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const resumeData = resume as any

    // Update status to processing
    await supabase
      .from('ats_resumes')
      .update({ parsing_status: 'processing' })
      .eq('id', resumeId)

    try {
      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('resumes')
        .download(resumeData.file_url.replace(/^.*\/resumes\//, ''))

      if (downloadError || !fileData) {
        throw new Error('Failed to download file from storage')
      }

      // Convert to buffer
      const buffer = Buffer.from(await fileData.arrayBuffer())

      // Parse with LlamaParse
      const { jobId, markdown } = await parseDocument(
        buffer,
        resumeData.file_name,
        resumeData.file_type || 'application/pdf'
      )

      // Extract structured data using OpenAI
      const parsedData = await extractResumeData(markdown)

      // Update resume with job ID
      await supabase
        .from('ats_resumes')
        .update({
          parsing_status: 'completed',
          llamaparse_job_id: jobId,
        })
        .eq('id', resumeId)

      // Insert or update parsed data
      const { error: insertError } = await supabase
        .from('parsed_resume_data')
        .upsert({
          resume_id: resumeId,
          candidate_name: parsedData.candidate_name,
          email: parsedData.email,
          phone: parsedData.phone,
          skills: parsedData.skills,
          experience_years: parsedData.experience_years,
          education: parsedData.education,
          work_experience: parsedData.work_experience,
          raw_text: parsedData.raw_text,
          parsed_at: new Date().toISOString(),
        } as any, {
          onConflict: 'resume_id',
        })

      if (insertError) {
        console.error('Failed to insert parsed data:', insertError)
      }

      return NextResponse.json({
        success: true,
        resumeId,
        parsedData: {
          candidate_name: parsedData.candidate_name,
          email: parsedData.email,
          skills_count: parsedData.skills.length,
          experience_years: parsedData.experience_years,
        },
      })
    } catch (parseError) {
      console.error('Parsing failed:', parseError)

      // Update status to failed
      await supabase
        .from('ats_resumes')
        .update({
          parsing_status: 'failed',
          parsing_error: parseError instanceof Error ? parseError.message : 'Unknown error',
        })
        .eq('id', resumeId)

      return NextResponse.json({
        error: 'Parsing failed',
        details: parseError instanceof Error ? parseError.message : 'Unknown error',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Parse API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ats/parse?resumeId=xxx
 * Get parsing status for a resume
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const resumeId = searchParams.get('resumeId')

    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 })
    }

    const { data: resume, error } = await supabase
      .from('ats_resumes')
      .select(`
        *,
        parsed_data:parsed_resume_data(*)
      `)
      .eq('id', resumeId)
      .single()

    if (error || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const resumeData = resume as any

    return NextResponse.json({
      resumeId,
      status: resumeData.parsing_status,
      error: resumeData.parsing_error,
      parsedData: resumeData.parsed_data?.[0] || null,
    })
  } catch (error) {
    console.error('Get parse status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
