import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout'
import { AdminDashboard, EmployeeDashboard } from '@/components/features/dashboard'

// Prevent Next.js from caching this page
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // If no user, middleware will handle redirect
    if (!user) {
        return null
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Use profile data or fallback to user email
    const userName = profile?.full_name || user.email?.split('@')[0] || 'User'
    const isAdmin = profile?.role === 'admin'

    // Common date calculations
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (isAdmin) {
        // Admin Dashboard Stats

        // Count total employees
        const { count: totalEmployees } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'employee')
            .eq('status', 'active')

        // Count all active tasks
        const { count: activeTasks } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('is_archived', false)
            .neq('status', 'done')

        // Count tasks in review (pending approvals)
        const { count: pendingReviews } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'review')
            .eq('is_archived', false)

        // Count tasks due in next 7 days
        const { count: upcomingDeadlines } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('is_archived', false)
            .neq('status', 'done')
            .gte('due_date', startOfDay.toISOString())
            .lte('due_date', nextWeek.toISOString())

        // Get recent task activity (recently updated tasks)
        const { data: recentTasks } = await supabase
            .from('tasks')
            .select(`
                *,
                assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)
            `)
            .order('updated_at', { ascending: false })
            .limit(5)

        // Calculate completion rate this month
        const { count: completedThisMonth } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'done')
            .gte('updated_at', startOfMonth.toISOString())

        const { count: totalTasksThisMonth } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString())

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

    // Employee Dashboard Stats

    // Tasks assigned to this employee
    const { data: myTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('is_archived', false)

    // Count tasks completed this month
    const { count: completedThisMonth } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'done')
        .gte('updated_at', startOfMonth.toISOString())

    // Count tasks in review
    const { count: pendingReviews } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'review')

    // Count tasks due today
    const { count: tasksDueToday } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('status', 'done')
        .gte('due_date', startOfDay.toISOString())
        .lte('due_date', endOfDay.toISOString())

    // Get high priority tasks (high/urgent, not done)
    const { data: highPriorityTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('is_archived', false)
        .neq('status', 'done')
        .in('priority', ['high', 'urgent'])
        .order('due_date', { ascending: true })
        .limit(5)

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
