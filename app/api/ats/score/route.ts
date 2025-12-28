/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateATSScore, JobRequirements, ParsedResumeData } from '@/lib/ats/scoring'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScoreRequest {
  resumeIds: string[]
  jobId: string
}

/**
 * POST /api/ats/score
 * Calculate ATS scores for resumes against a job
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

    const body: ScoreRequest = await req.json()
    const { resumeIds, jobId } = body

    if (!resumeIds || resumeIds.length === 0) {
      return NextResponse.json({ error: 'Resume IDs are required' }, { status: 400 })
    }

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('ats_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const jobData = job as any

    const jobRequirements: JobRequirements = {
      title: jobData.title,
      required_skills: jobData.required_skills || [],
      preferred_skills: jobData.preferred_skills || [],
      experience_years_min: jobData.experience_years_min || 0,
      experience_years_max: jobData.experience_years_max || null,
      education_requirements: jobData.education_requirements || [],
      description: jobData.description,
    }

    // Get parsed data for all resumes
    const { data: parsedResumes, error: resumeError } = await supabase
      .from('parsed_resume_data')
      .select('*')
      .in('resume_id', resumeIds)

    if (resumeError) {
      return NextResponse.json({ error: 'Failed to fetch resume data' }, { status: 500 })
    }

    // Calculate scores for each resume
    const results = []

    for (const parsed of parsedResumes || []) {
      const parsedData = parsed as any
      const resumeData: ParsedResumeData = {
        candidate_name: parsedData.candidate_name,
        email: parsedData.email,
        phone: parsedData.phone,
        skills: parsedData.skills || [],
        experience_years: parsedData.experience_years,
        education: parsedData.education || [],
        work_experience: parsedData.work_experience || [],
        raw_text: parsedData.raw_text,
      }

      const score = calculateATSScore(resumeData, jobRequirements)

      // Upsert score to database
      const { error: scoreError } = await supabase
        .from('ats_scores')
        .upsert({
          resume_id: parsedData.resume_id,
          job_id: jobId,
          overall_score: score.overall_score,
          skill_match_score: score.skill_match_score,
          experience_score: score.experience_score,
          education_score: score.education_score,
          keyword_density_score: score.keyword_density_score,
          keyword_matches: score.keyword_matches,
          score_breakdown: score.score_breakdown,
          calculated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'resume_id,job_id',
        })

      if (scoreError) {
        console.error('Failed to save score:', scoreError)
      }

      results.push({
        resumeId: parsedData.resume_id,
        candidateName: parsedData.candidate_name,
        ...score,
      })
    }

    // Sort by overall score descending
    results.sort((a, b) => b.overall_score - a.overall_score)

    return NextResponse.json({
      success: true,
      jobId,
      jobTitle: jobData.title,
      scores: results,
    })
  } catch (error) {
    console.error('Score API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ats/score?jobId=xxx
 * Get all scores for a job
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
    const jobId = searchParams.get('jobId')
    const resumeId = searchParams.get('resumeId')

    if (resumeId && jobId) {
      // Get specific score
      const { data: score, error } = await supabase
        .from('ats_scores')
        .select(`
          *,
          resume:ats_resumes(
            *,
            parsed_data:parsed_resume_data(*)
          )
        `)
        .eq('resume_id', resumeId)
        .eq('job_id', jobId)
        .single()

      if (error || !score) {
        return NextResponse.json({ error: 'Score not found' }, { status: 404 })
      }

      return NextResponse.json(score)
    }

    if (jobId) {
      // Get all scores for a job
      const { data: scores, error } = await supabase
        .from('ats_scores')
        .select(`
          *,
          resume:ats_resumes(
            id,
            file_name,
            parsed_data:parsed_resume_data(candidate_name, email, skills)
          )
        `)
        .eq('job_id', jobId)
        .order('overall_score', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
      }

      return NextResponse.json({ scores: scores || [] })
    }

    return NextResponse.json({ error: 'Job ID or Resume ID required' }, { status: 400 })
  } catch (error) {
    console.error('Get scores error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
