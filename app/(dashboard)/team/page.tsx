import { createClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/layout'
import { TeamPageClient } from '@/components/features/team/team-page-client'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
    const supabase = await createClient()

    // Use cached auth - deduplicated with layout
    const user = await getAuthenticatedUser()

    if (!user) {
        return null
    }

    const isAdmin = user.role === 'admin'

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

