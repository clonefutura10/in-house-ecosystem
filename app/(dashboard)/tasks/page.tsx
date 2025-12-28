import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout'
import { TasksPageClient } from '@/components/features/tasks/tasks-page-client'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
    const supabase = await createClient()

    // Use cached auth - deduplicated with layout
    const user = await getAuthenticatedUser()

    if (!user) {
        return null
    }

    const isAdmin = user.role === 'admin'

    // Fetch all data in parallel for better performance
    const [
        { data: activeTasks, error: activeError },
        { data: archivedTasks, error: archivedError },
        { data: profiles },
    ] = await Promise.all([
        // Fetch active tasks with assignee info
        supabase
            .from('tasks')
            .select(`
                *,
                assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, email)
            `)
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),

        // Fetch archived tasks with assignee info
        supabase
            .from('tasks')
            .select(`
                *,
                assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, email)
            `)
            .eq('is_archived', true)
            .order('updated_at', { ascending: false }),

        // Fetch employee profiles for assignee dropdown (exclude admins)
        supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email, role')
            .eq('status', 'active')
            .eq('role', 'employee')
            .order('full_name'),
    ])

    if (activeError) {
        console.error('Error fetching active tasks:', activeError)
    }

    if (archivedError) {
        console.error('Error fetching archived tasks:', archivedError)
    }

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

