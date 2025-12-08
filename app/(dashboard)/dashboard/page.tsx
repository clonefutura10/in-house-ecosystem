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

    if (isAdmin) {
        return (
            <PageContainer>
                <AdminDashboard userName={userName} />
            </PageContainer>
        )
    }

    // Fetch employee-specific stats
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

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

    const stats = {
        tasksCompletedThisMonth: completedThisMonth || 0,
        pendingReviews: pendingReviews || 0,
        tasksDueToday: tasksDueToday || 0,
        totalTasks: myTasks?.length || 0,
    }

    return (
        <PageContainer>
            <EmployeeDashboard
                userName={userName}
                stats={stats}
                highPriorityTasks={highPriorityTasks || []}
            />
        </PageContainer>
    )
}
