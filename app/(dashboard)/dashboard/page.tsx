import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout'
import { AdminDashboard, EmployeeDashboard } from '@/components/features/dashboard'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

// Prevent Next.js from caching this page
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Use cached auth function - this is deduplicated with the layout call
    const user = await getAuthenticatedUser()

    if (!user) {
        return null
    }

    const { id: userId, full_name: userName, role } = user
    const isAdmin = role === 'admin'

    // Common date calculations
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (isAdmin) {
        // Admin Dashboard Stats - ALL QUERIES RUN IN PARALLEL
        const [
            { count: totalEmployees },
            { count: activeTasks },
            { count: pendingReviews },
            { count: upcomingDeadlines },
            { data: recentTasks },
            { count: completedThisMonth },
            { count: totalTasksThisMonth },
        ] = await Promise.all([
            // Count total employees
            supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'employee')
                .eq('status', 'active'),

            // Count all active tasks
            supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('is_archived', false)
                .neq('status', 'done'),

            // Count tasks in review (pending approvals)
            supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'review')
                .eq('is_archived', false),

            // Count tasks due in next 7 days
            supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('is_archived', false)
                .neq('status', 'done')
                .gte('due_date', startOfDay.toISOString())
                .lte('due_date', nextWeek.toISOString()),

            // Get recent task activity (recently updated tasks)
            supabase
                .from('tasks')
                .select(`
                    *,
                    assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
                `)
                .order('updated_at', { ascending: false })
                .limit(5),

            // Calculate completion rate this month
            supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'done')
                .gte('updated_at', startOfMonth.toISOString()),

            // Total tasks created this month
            supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startOfMonth.toISOString()),
        ])

        const adminStats = {
            totalEmployees: totalEmployees || 0,
            activeTasks: activeTasks || 0,
            pendingReviews: pendingReviews || 0,
            upcomingDeadlines: upcomingDeadlines || 0,
            completedThisMonth: completedThisMonth || 0,
            totalTasksThisMonth: totalTasksThisMonth || 0,
        }

        return (
            <PageContainer>
                <AdminDashboard
                    userName={userName}
                    stats={adminStats}
                    recentActivity={recentTasks || []}
                />
            </PageContainer>
        )
    }

    // Employee Dashboard Stats - ALL QUERIES RUN IN PARALLEL
    const [
        { data: myTasks },
        { count: completedThisMonth },
        { count: pendingReviews },
        { count: tasksDueToday },
        { data: highPriorityTasks },
    ] = await Promise.all([
        // Tasks assigned to this employee
        supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', userId)
            .eq('is_archived', false),

        // Count tasks completed this month
        supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', userId)
            .eq('status', 'done')
            .gte('updated_at', startOfMonth.toISOString()),

        // Count tasks in review
        supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', userId)
            .eq('status', 'review'),

        // Count tasks due today
        supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', userId)
            .neq('status', 'done')
            .gte('due_date', startOfDay.toISOString())
            .lte('due_date', endOfDay.toISOString()),

        // Get high priority tasks (high/urgent, not done)
        supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', userId)
            .eq('is_archived', false)
            .neq('status', 'done')
            .in('priority', ['high', 'urgent'])
            .order('due_date', { ascending: true })
            .limit(5),
    ])

    const employeeStats = {
        tasksCompletedThisMonth: completedThisMonth || 0,
        pendingReviews: pendingReviews || 0,
        tasksDueToday: tasksDueToday || 0,
        totalTasks: myTasks?.length || 0,
    }

    return (
        <PageContainer>
            <EmployeeDashboard
                userName={userName}
                stats={employeeStats}
                highPriorityTasks={highPriorityTasks || []}
            />
        </PageContainer>
    )
}
