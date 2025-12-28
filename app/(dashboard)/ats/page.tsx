/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: ats_jobs and ats_resumes tables are created by migration 20251228000000_ats_system.sql
// After running the migration, regenerate types with: npx supabase gen types typescript --local > types/supabase.ts

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { PageContainer } from '@/components/layout'
import { redirect } from 'next/navigation'
import { ATSPageClient } from '@/components/features/ats'

export const dynamic = 'force-dynamic'

export default async function ATSPage() {
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    // Only admins can access this page
    if (user.role !== 'admin') {
        redirect('/dashboard')
    }

    const supabase = await createClient()

    // Fetch initial data including scores
    const [{ data: jobs }, { data: resumes }, { data: scores }] = await Promise.all([
        supabase
            .from('ats_jobs')
            .select(`
                *,
                creator:profiles!ats_jobs_created_by_fkey(full_name)
            `)
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),
        supabase
            .from('ats_resumes')
            .select(`
                *,
                uploader:profiles!ats_resumes_uploaded_by_fkey(full_name),
                parsed_data:parsed_resume_data(*),
                job:ats_jobs(id, title)
            `)
            .order('created_at', { ascending: false }),
        supabase
            .from('ats_scores')
            .select('*')
            .order('calculated_at', { ascending: false }),
    ])

    return (
        <PageContainer>
            <ATSPageClient
                initialJobs={(jobs as any) || []}
                initialResumes={(resumes as any) || []}
                initialScores={(scores as any) || []}
            />
        </PageContainer>
    )
}
