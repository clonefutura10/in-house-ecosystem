/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ats/resumes
 * Get all resumes with optional filters
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const jobId = searchParams.get('jobId')

    let query = supabase
      .from('ats_resumes')
      .select(`
        *,
        uploader:profiles!ats_resumes_uploaded_by_fkey(full_name),
        parsed_data:parsed_resume_data(*),
        job:ats_jobs(id, title)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('parsing_status', status as any)
    }

    // Filter by job: 'global' for null job_id, specific uuid for job-specific
    if (jobId === 'global') {
      query = query.is('job_id', null)
    } else if (jobId && jobId !== 'all') {
      query = query.eq('job_id', jobId)
    }

    const { data: resumes, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 })
    }

    return NextResponse.json({ resumes: resumes || [] })
  } catch (error) {
    console.error('Get resumes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ats/resumes
 * Register a new resume (after upload to storage)
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

    const body = await req.json() as {
      file_name: string
      file_url: string
      file_type?: string
      file_size?: number
      job_id?: string | null
    }
    const { file_name, file_url, file_type, file_size, job_id } = body

    if (!file_name || !file_url) {
      return NextResponse.json({ error: 'File name and URL are required' }, { status: 400 })
    }

    const { data: resume, error } = await supabase
      .from('ats_resumes')
      .insert({
        file_name,
        file_url,
        file_type,
        file_size,
        job_id: job_id || null, // null = global resume
        uploaded_by: user.id,
        parsing_status: 'pending',
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Failed to create resume record:', error)
      return NextResponse.json({ error: 'Failed to create resume record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, resume })
  } catch (error) {
    console.error('Create resume error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ats/resumes?id=xxx
 * Delete a resume and its associated data
 */
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Resume ID is required' }, { status: 400 })
    }

    // Get file URL to delete from storage
    const { data: resume } = await supabase
      .from('ats_resumes')
      .select('file_url')
      .eq('id', id)
      .single()

    const resumeData = resume as any

    if (resumeData?.file_url) {
      // Extract path from URL and delete from storage
      const path = resumeData.file_url.replace(/^.*\/resumes\//, '')
      await supabase.storage.from('resumes').remove([path])
    }

    // Delete resume record (cascades to parsed_data and scores)
    const { error } = await supabase
      .from('ats_resumes')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete resume error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
