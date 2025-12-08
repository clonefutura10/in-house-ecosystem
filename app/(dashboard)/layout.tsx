import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout'

// Prevent Next.js from caching this layout
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // If no user, middleware will handle redirect
    // This should not happen as middleware protects this route
    if (!user) {
        return null
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // If no profile, show basic shell with user email
    const userInfo = profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            role: profile.role as 'admin' | 'employee',
        }
        : {
            id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar_url: null,
            role: 'employee' as const,
        }

    return <DashboardShell user={userInfo}>{children}</DashboardShell>
}
