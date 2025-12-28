import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { NotificationsPageClient } from '@/components/features/notifications/notifications-page-client'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
    const supabase = await createClient()

    // Use cached auth - deduplicated with layout
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    // Only admins can access notifications
    if (user.role !== 'admin') {
        redirect('/dashboard')
    }

    // Fetch all notifications with recipient info
    const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
            *,
            recipient:profiles!notifications_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching notifications:', error)
    }

    return (
        <PageContainer>
            <NotificationsPageClient notifications={notifications || []} />
        </PageContainer>
    )
}

