import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { PerformancePageClient } from '@/components/features/performance/performance-page-client'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is admin
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const isAdmin = currentProfile?.role === 'admin'

    // Fetch all employees (for admin)
    const { data: employees } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, department, job_title, role, status')
        .order('full_name')

    // Fetch performance metrics directly with proper typing
    let performanceMetrics: Array<{
        id: string
        user_id: string
        period_start: string
        period_end: string
        tasks_assigned: number
        tasks_completed: number
        tasks_on_time: number
        tasks_overdue: number
        completion_rate: number
        on_time_rate: number
        overall_score: number
        incentive_percentage: number
        attendance_rate: number
        quality_rating: number
        manager_notes: string | null
        user?: {
            id: string
            full_name: string
            email: string
            avatar_url: string | null
            department: string | null
        }
    }> = []

    try {
        // Use service role approach - fetch without RLS restrictions for admin
        const { data, error } = await supabase
            .from('performance_metrics' as 'profiles') // Type workaround
            .select(`
                id,
                user_id,
                period_start,
                period_end,
                tasks_assigned,
                tasks_completed,
                tasks_on_time,
                tasks_overdue,
                completion_rate,
                on_time_rate,
                overall_score,
                incentive_percentage,
                attendance_rate,
                quality_rating,
                manager_notes
            `)
            .order('period_start', { ascending: false })

        if (!error && data) {
            // Manually join with profiles
            const userIds = [...new Set((data as unknown as Array<{ user_id: string }>).map(d => d.user_id))]
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, department')
                .in('id', userIds)

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

            performanceMetrics = (data as unknown as typeof performanceMetrics).map(d => ({
                ...d,
                user: profileMap.get(d.user_id)
            }))
        }
    } catch (e) {
        console.error('Error fetching performance metrics:', e)
        performanceMetrics = []
    }

    // Fetch appraisals
    let appraisals: Array<{
        id: string
        user_id: string
        reviewer_id: string
        period: string
        period_year: number
        period_number: number
        productivity_score: number
        quality_score: number
        teamwork_score: number
        communication_score: number
        initiative_score: number
        overall_score: number
        strengths: string | null
        areas_for_improvement: string | null
        goals_for_next_period: string | null
        manager_comments: string | null
        status: string
        is_published: boolean
        user?: {
            id: string
            full_name: string
            email: string
            avatar_url: string | null
        }
        reviewer?: {
            id: string
            full_name: string
        }
    }> = []

    try {
        const { data, error } = await supabase
            .from('appraisals' as 'profiles') // Type workaround
            .select(`
                id,
                user_id,
                reviewer_id,
                period,
                period_year,
                period_number,
                productivity_score,
                quality_score,
                teamwork_score,
                communication_score,
                initiative_score,
                overall_score,
                strengths,
                areas_for_improvement,
                goals_for_next_period,
                manager_comments,
                status,
                is_published
            `)
            .order('created_at', { ascending: false })

        if (!error && data) {
            // Manually join with profiles
            const userIds = [...new Set((data as unknown as Array<{ user_id: string; reviewer_id: string }>).flatMap(d => [d.user_id, d.reviewer_id]))]
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .in('id', userIds)

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

            appraisals = (data as unknown as typeof appraisals).map(d => ({
                ...d,
                user: profileMap.get(d.user_id),
                reviewer: profileMap.get(d.reviewer_id) ? { id: profileMap.get(d.reviewer_id)!.id, full_name: profileMap.get(d.reviewer_id)!.full_name } : undefined
            }))
        }
    } catch (e) {
        console.error('Error fetching appraisals:', e)
        appraisals = []
    }

    // Fetch tasks for summary stats
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status, assigned_to, due_date, updated_at, created_at')
        .eq('is_archived', false)

    // Map tasks with proper types
    const mappedTasks = (tasks || []).map(t => ({
        id: t.id,
        status: t.status || 'todo',
        assigned_to: t.assigned_to,
        due_date: t.due_date,
        updated_at: t.updated_at,
        created_at: t.created_at,
    }))

    return (
        <PageContainer>
            <PerformancePageClient
                currentUser={currentProfile}
                isAdmin={isAdmin}
                employees={employees || []}
                performanceMetrics={performanceMetrics}
                appraisals={appraisals}
                tasks={mappedTasks}
            />
        </PageContainer>
    )
}
