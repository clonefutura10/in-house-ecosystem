import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout'
import { TeamPageClient } from '@/components/features/team/team-page-client'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    // Fetch current user's profile to check if admin
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = currentProfile?.role === 'admin'

    // Fetch all employees
    const { data: employees, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching employees:', error)
    }

    return (
        <PageContainer>
            <TeamPageClient
                employees={employees || []}
                isAdmin={isAdmin}
                currentUserId={user.id}
            />
        </PageContainer>
    )
}
