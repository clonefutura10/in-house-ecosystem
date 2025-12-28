import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractJobKeywords } from '@/lib/ats/scoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ats/jobs
 * Get all jobs
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
    const includeArchived = searchParams.get('includeArchived') === 'true'

    let query = supabase
      .from('ats_jobs')
      .select(`
        *,
        creator:profiles!ats_jobs_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data: jobs, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    return NextResponse.json({ jobs: jobs || [] })
  } catch (error) {
    console.error('Get jobs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ats/jobs
 * Create a new job
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

    const body = await req.json()
    const {
      title,
      department,
      description,
      required_skills,
      preferred_skills,
      experience_years_min,
      experience_years_max,
      education_requirements,
      auto_extract_keywords,
    } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    // Auto-extract keywords from description if requested
    let finalRequiredSkills = required_skills || []
    let finalPreferredSkills = preferred_skills || []
    let finalEducation = education_requirements || []

    if (auto_extract_keywords && description) {
      const extracted = await extractJobKeywords(description)
      finalRequiredSkills = [...new Set([...finalRequiredSkills, ...extracted.required_skills])]
      finalPreferredSkills = [...new Set([...finalPreferredSkills, ...extracted.preferred_skills])]
      finalEducation = [...new Set([...finalEducation, ...extracted.education_requirements])]
    }

    const { data: job, error } = await supabase
      .from('ats_jobs')
      .insert({
        title,
        department,
        description,
        required_skills: finalRequiredSkills,
        preferred_skills: finalPreferredSkills,
        experience_years_min: experience_years_min || 0,
        experience_years_max: experience_years_max || null,
        education_requirements: finalEducation,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create job:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Create job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/ats/jobs
 * Update a job
 */
export async function PATCH(req: NextRequest) {
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

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const { data: job, error } = await supabase
      .from('ats_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
    }

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Update job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ats/jobs?id=xxx
 * Archive a job (soft delete)
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
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ats_jobs')
      .update({ is_archived: true })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to archive job' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
