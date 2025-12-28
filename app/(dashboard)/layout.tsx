import { DashboardShell } from '@/components/layout'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

// Prevent Next.js from caching this layout
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Use cached auth function - this will be deduplicated across all server components
    const user = await getAuthenticatedUser()

    // If no user, middleware will handle redirect
    if (!user) {
        return null
    }

    return (
        <DashboardShell user={user}>
            {children}
        </DashboardShell>
    )
}

