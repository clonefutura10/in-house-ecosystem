import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { NotificationsPageClient } from '@/components/features/notifications/notifications-page-client'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
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
        .select('role')
        .eq('id', user.id)
        .single()

    if (currentProfile?.role !== 'admin') {
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
