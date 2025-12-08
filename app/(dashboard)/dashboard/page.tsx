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
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Debug: Log profile data to server console
    console.log('Dashboard - User ID:', user.id)
    console.log('Dashboard - Profile:', profile)
    console.log('Dashboard - Profile Error:', profileError)
    console.log('Dashboard - Role:', profile?.role)

    // Use profile data or fallback to user email
    const userName = profile?.full_name || user.email?.split('@')[0] || 'User'
    const isAdmin = profile?.role === 'admin'
    console.log('Dashboard - isAdmin:', isAdmin)

    return (
        <PageContainer>
            {isAdmin ? (
                <AdminDashboard userName={userName} />
            ) : (
                <EmployeeDashboard userName={userName} />
            )}
        </PageContainer>
    )
}
