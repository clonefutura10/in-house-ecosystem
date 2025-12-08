import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout'
import { TasksPageClient } from '@/components/features/tasks/tasks-page-client'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    // Fetch current user's profile
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = currentProfile?.role === 'admin'

    // Fetch active tasks with assignee info
    const { data: activeTasks, error: activeError } = await supabase
        .from('tasks')
        .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, email)
    `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

    if (activeError) {
        console.error('Error fetching active tasks:', activeError)
    }

    // Fetch archived tasks with assignee info
    const { data: archivedTasks, error: archivedError } = await supabase
        .from('tasks')
        .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, email)
    `)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })

    if (archivedError) {
        console.error('Error fetching archived tasks:', archivedError)
    }

    // Fetch employee profiles for assignee dropdown (exclude admins)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, role')
        .eq('status', 'active')
        .eq('role', 'employee')
        .order('full_name')

    return (
        <PageContainer>
            <TasksPageClient
                tasks={activeTasks || []}
                archivedTasks={archivedTasks || []}
                profiles={profiles || []}
                isAdmin={isAdmin}
                currentUserId={user.id}
            />
        </PageContainer>
    )
}
